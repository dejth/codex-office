import { spawn, type ChildProcess } from "node:child_process";
import { accessSync, constants, lstatSync } from "node:fs";
import { createConnection } from "node:net";
import { homedir } from "node:os";
import { delimiter, join } from "node:path";

import WebSocket, { type ClientOptions, type RawData } from "ws";

const MAX_LINE_BYTES = 1_048_576;

export class CodexTransportError extends Error {
  constructor(
    readonly code:
      | "executable-not-found"
      | "spawn-failed"
      | "invalid-stdio"
      | "socket-unavailable"
      | "socket-permissions"
      | "protocol-failed"
      | "timeout" = "protocol-failed",
  ) {
    super("Codex App Server transport failed");
    this.name = "CodexTransportError";
  }
}

interface WritableInput {
  write(chunk: string): boolean;
  end(): void;
}

interface ReadableOutput {
  on(event: "data", listener: (chunk: Buffer | string) => void): this;
}

export interface AppServerProcess {
  stdin: WritableInput | null;
  stdout: ReadableOutput | null;
  once(event: "error", listener: () => void): unknown;
  once(event: "exit", listener: () => void): unknown;
  kill(): boolean;
}

export type SpawnAppServer = () => AppServerProcess;

interface PendingRequest {
  resolve(value: unknown): void;
  reject(error: CodexTransportError): void;
  timer: NodeJS.Timeout;
}

export interface CodexRpcTransport {
  start(): void;
  request(method: string, params: unknown): Promise<unknown>;
  notify(method: string): void;
  stop(): void;
}

export interface CodexStdioTransportOptions {
  command?: string;
  requestTimeoutMs?: number;
  spawnProcess?: SpawnAppServer;
}

interface UnixWebSocket {
  readyState: number;
  on(event: "open", listener: () => void): this;
  on(event: "message", listener: (data: RawData) => void): this;
  on(event: "error" | "close", listener: () => void): this;
  send(data: string): void;
  close(): void;
  terminate(): void;
}

export interface CodexUnixSocketTransportOptions {
  socketPath?: string;
  requestTimeoutMs?: number;
  createSocket?: (address: string, options: ClientOptions) => UnixWebSocket;
  inspectSocket?: (path: string) => {
    mode: number;
    uid: number;
    isSocket(): boolean;
  };
  currentUid?: () => number | undefined;
}

export function defaultCodexSharedSocketPath(
  userHome: string = homedir(),
): string {
  return join(
    userHome,
    ".codex",
    "app-server-control",
    "app-server-control.sock",
  );
}

export function isSecureCodexSharedSocket(
  socketPath: string = defaultCodexSharedSocketPath(),
): boolean {
  try {
    const metadata = lstatSync(socketPath);
    const currentUid = process.getuid?.();
    return (
      metadata.isSocket() &&
      (currentUid === undefined || metadata.uid === currentUid) &&
      (metadata.mode & 0o077) === 0
    );
  } catch {
    return false;
  }
}

/**
 * Minimal JSON-RPC client for an explicitly shared, owner-only local App
 * Server Unix socket. Notifications are discarded at the transport boundary.
 */
export class CodexUnixSocketTransport implements CodexRpcTransport {
  private readonly socketPath: string;
  private readonly requestTimeoutMs: number;
  private readonly createSocket: NonNullable<
    CodexUnixSocketTransportOptions["createSocket"]
  >;
  private readonly inspectSocket: NonNullable<
    CodexUnixSocketTransportOptions["inspectSocket"]
  >;
  private readonly currentUid: NonNullable<
    CodexUnixSocketTransportOptions["currentUid"]
  >;
  private socket: UnixWebSocket | undefined;
  private ready: Promise<void> | undefined;
  private rejectReady: ((error: CodexTransportError) => void) | undefined;
  private pending = new Map<number, PendingRequest>();
  private nextId = 1;

  constructor(options: CodexUnixSocketTransportOptions = {}) {
    this.socketPath = options.socketPath ?? defaultCodexSharedSocketPath();
    this.requestTimeoutMs = options.requestTimeoutMs ?? 10_000;
    this.createSocket =
      options.createSocket ??
      ((address, socketOptions) =>
        new WebSocket(address, socketOptions) as UnixWebSocket);
    this.inspectSocket = options.inspectSocket ?? lstatSync;
    this.currentUid = options.currentUid ?? (() => process.getuid?.());
  }

  start(): void {
    if (this.socket !== undefined) return;
    let metadata: ReturnType<typeof this.inspectSocket>;
    try {
      metadata = this.inspectSocket(this.socketPath);
    } catch {
      throw new CodexTransportError("socket-unavailable");
    }
    const currentUid = this.currentUid();
    if (
      !metadata.isSocket() ||
      (currentUid !== undefined && metadata.uid !== currentUid) ||
      (metadata.mode & 0o077) !== 0
    ) {
      throw new CodexTransportError("socket-permissions");
    }

    const socket = this.createSocket("ws://localhost/rpc", {
      createConnection: () => createConnection({ path: this.socketPath }),
      handshakeTimeout: this.requestTimeoutMs,
      maxPayload: MAX_LINE_BYTES,
      perMessageDeflate: false,
    });
    this.socket = socket;
    this.ready = new Promise<void>((resolve, reject) => {
      this.rejectReady = reject;
      socket.on("open", () => {
        this.rejectReady = undefined;
        resolve();
      });
    });
    socket.on("message", (data) => this.acceptMessage(data));
    socket.on("error", () => this.fail());
    socket.on("close", () => this.fail());
  }

  async request(method: string, params: unknown): Promise<unknown> {
    const socket = this.socket;
    const ready = this.ready;
    if (socket === undefined || ready === undefined) {
      throw new CodexTransportError();
    }
    await ready;
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new CodexTransportError("timeout"));
      }, this.requestTimeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      try {
        socket.send(JSON.stringify({ method, id, params }));
      } catch {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(new CodexTransportError());
      }
    });
  }

  notify(method: string): void {
    const socket = this.socket;
    if (socket === undefined || socket.readyState !== WebSocket.OPEN) {
      throw new CodexTransportError();
    }
    try {
      socket.send(JSON.stringify({ method }));
    } catch {
      throw new CodexTransportError();
    }
  }

  stop(): void {
    const socket = this.socket;
    this.socket = undefined;
    this.ready = undefined;
    this.rejectReady?.(new CodexTransportError());
    this.rejectReady = undefined;
    this.rejectPending();
    if (socket === undefined) return;
    if (socket.readyState === WebSocket.OPEN) socket.close();
    else socket.terminate();
  }

  private acceptMessage(data: RawData): void {
    const bytes = rawDataToBuffer(data);
    if (bytes === null || bytes.byteLength > MAX_LINE_BYTES) {
      this.fail();
      return;
    }
    let message: unknown;
    try {
      message = JSON.parse(bytes.toString("utf8"));
    } catch {
      this.fail();
      return;
    }
    if (
      typeof message !== "object" ||
      message === null ||
      !("id" in message) ||
      typeof message.id !== "number" ||
      !Number.isSafeInteger(message.id)
    ) {
      return;
    }
    const pending = this.pending.get(message.id);
    if (pending === undefined) return;
    clearTimeout(pending.timer);
    this.pending.delete(message.id);
    if ("result" in message) pending.resolve(message.result);
    else pending.reject(new CodexTransportError());
  }

  private fail(): void {
    const socket = this.socket;
    this.socket = undefined;
    this.ready = undefined;
    this.rejectReady?.(new CodexTransportError());
    this.rejectReady = undefined;
    this.rejectPending();
    if (socket !== undefined && socket.readyState !== WebSocket.CLOSED) {
      socket.terminate();
    }
  }

  private rejectPending(): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new CodexTransportError());
    }
    this.pending.clear();
  }
}

function rawDataToBuffer(data: RawData): Buffer | null {
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof ArrayBuffer) return Buffer.from(data);
  if (Array.isArray(data)) return Buffer.concat(data);
  return null;
}

/** Minimal content-blind JSONL client for a locally owned App Server process. */
export class CodexStdioTransport implements CodexRpcTransport {
  private readonly requestTimeoutMs: number;
  private readonly spawnProcess: SpawnAppServer;
  private process: AppServerProcess | undefined;
  private pending = new Map<number, PendingRequest>();
  private nextId = 1;
  private buffer = "";

  constructor(options: CodexStdioTransportOptions = {}) {
    this.requestTimeoutMs = options.requestTimeoutMs ?? 10_000;
    if (options.spawnProcess !== undefined) {
      this.spawnProcess = options.spawnProcess;
    } else {
      this.spawnProcess = () => {
        const command =
          options.command ?? resolveCodexExecutable(process.env.PATH);
        if (command === null) {
          throw new CodexTransportError("executable-not-found");
        }
        return spawn(command, ["app-server", "--stdio"], {
          shell: false,
          stdio: ["pipe", "pipe", "ignore"],
        }) as ChildProcess;
      };
    }
  }

  start(): void {
    if (this.process !== undefined) return;
    const process = this.spawnProcess();
    if (process.stdin === null || process.stdout === null) {
      process.kill();
      throw new CodexTransportError("invalid-stdio");
    }
    this.process = process;
    process.stdout.on("data", (chunk) => this.acceptChunk(chunk));
    process.once("error", () => this.fail("spawn-failed"));
    process.once("exit", () => this.fail());
  }

  request(method: string, params: unknown): Promise<unknown> {
    const process = this.process;
    const input = process?.stdin;
    if (input === null || input === undefined) {
      return Promise.reject(new CodexTransportError());
    }
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new CodexTransportError("timeout"));
      }, this.requestTimeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      try {
        input.write(`${JSON.stringify({ method, id, params })}\n`);
      } catch {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(new CodexTransportError());
      }
    });
  }

  notify(method: string): void {
    const input = this.process?.stdin;
    if (input === null || input === undefined) throw new CodexTransportError();
    try {
      input.write(`${JSON.stringify({ method })}\n`);
    } catch {
      throw new CodexTransportError();
    }
  }

  stop(): void {
    const process = this.process;
    this.process = undefined;
    this.buffer = "";
    this.rejectPending();
    if (process === undefined) return;
    process.stdin?.end();
    process.kill();
  }

  private acceptChunk(chunk: Buffer | string): void {
    this.buffer += chunk.toString();
    if (Buffer.byteLength(this.buffer) > MAX_LINE_BYTES) {
      this.fail();
      return;
    }
    let newline = this.buffer.indexOf("\n");
    while (newline >= 0) {
      const line = this.buffer.slice(0, newline);
      this.buffer = this.buffer.slice(newline + 1);
      if (line.length > 0) this.acceptLine(line);
      newline = this.buffer.indexOf("\n");
    }
  }

  private acceptLine(line: string): void {
    let message: unknown;
    try {
      message = JSON.parse(line);
    } catch {
      this.fail();
      return;
    }
    if (
      typeof message !== "object" ||
      message === null ||
      !("id" in message) ||
      typeof message.id !== "number" ||
      !Number.isSafeInteger(message.id)
    ) {
      return;
    }
    const pending = this.pending.get(message.id);
    if (pending === undefined) return;
    clearTimeout(pending.timer);
    this.pending.delete(message.id);
    if ("result" in message) {
      pending.resolve(message.result);
    } else {
      pending.reject(new CodexTransportError());
    }
  }

  private fail(code: CodexTransportError["code"] = "protocol-failed"): void {
    const process = this.process;
    this.process = undefined;
    this.buffer = "";
    this.rejectPending(code);
    process?.kill();
  }

  private rejectPending(
    code: CodexTransportError["code"] = "protocol-failed",
  ): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new CodexTransportError(code));
    }
    this.pending.clear();
  }
}

/**
 * Finds Codex without a shell. The returned path is used locally and is never
 * included in provider diagnostics or snapshots.
 */
export function resolveCodexExecutable(
  pathValue: string | undefined,
  userHome: string = homedir(),
): string | null {
  for (const candidate of codexExecutableCandidates(pathValue, userHome)) {
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Missing or non-executable candidates are expected.
    }
  }
  return null;
}

export function codexExecutableCandidates(
  pathValue: string | undefined,
  userHome: string,
  platform: NodeJS.Platform = process.platform,
): string[] {
  const names = platform === "win32" ? ["codex.exe", "codex"] : ["codex"];
  return [
    ...names.flatMap((name) => [
      join(userHome, ".local", "bin", name),
      join(userHome, ".cargo", "bin", name),
      join(userHome, ".bun", "bin", name),
    ]),
    ...(pathValue ?? "")
      .split(delimiter)
      .filter((entry) => entry.length > 0)
      .flatMap((entry) => names.map((name) => join(entry, name))),
    ...names.flatMap((name) => [
      join("/Applications/ChatGPT.app/Contents/Resources", name),
      join("/Applications/Codex.app/Contents/Resources", name),
      join("/opt/homebrew/bin", name),
      join("/usr/local/bin", name),
    ]),
  ];
}
