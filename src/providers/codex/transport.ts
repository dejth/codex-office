import { spawn, type ChildProcess } from "node:child_process";
import { accessSync, constants } from "node:fs";
import { homedir } from "node:os";
import { delimiter, join } from "node:path";

const MAX_LINE_BYTES = 1_048_576;

export class CodexTransportError extends Error {
  constructor(
    readonly code:
      | "executable-not-found"
      | "spawn-failed"
      | "invalid-stdio"
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
    ...(pathValue ?? "")
      .split(delimiter)
      .filter((entry) => entry.length > 0)
      .flatMap((entry) => names.map((name) => join(entry, name))),
    ...names.flatMap((name) => [
      join(userHome, ".local", "bin", name),
      join(userHome, ".cargo", "bin", name),
      join(userHome, ".bun", "bin", name),
      join("/Applications/ChatGPT.app/Contents/Resources", name),
      join("/Applications/Codex.app/Contents/Resources", name),
      join("/opt/homebrew/bin", name),
      join("/usr/local/bin", name),
    ]),
  ];
}
