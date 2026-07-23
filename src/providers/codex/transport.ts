import { spawn, type ChildProcess } from "node:child_process";

const MAX_LINE_BYTES = 1_048_576;

export class CodexTransportError extends Error {
  constructor() {
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
    const command = options.command ?? "codex";
    this.requestTimeoutMs = options.requestTimeoutMs ?? 10_000;
    this.spawnProcess =
      options.spawnProcess ??
      (() =>
        spawn(command, ["app-server", "--stdio"], {
          shell: false,
          stdio: ["pipe", "pipe", "ignore"],
        }) as ChildProcess);
  }

  start(): void {
    if (this.process !== undefined) return;
    const process = this.spawnProcess();
    if (process.stdin === null || process.stdout === null) {
      process.kill();
      throw new CodexTransportError();
    }
    this.process = process;
    process.stdout.on("data", (chunk) => this.acceptChunk(chunk));
    process.once("error", () => this.fail());
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
        reject(new CodexTransportError());
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

  private fail(): void {
    const process = this.process;
    this.process = undefined;
    this.buffer = "";
    this.rejectPending();
    process?.kill();
  }

  private rejectPending(): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new CodexTransportError());
    }
    this.pending.clear();
  }
}
