import { EventEmitter } from "node:events";

import { describe, expect, it, vi } from "vitest";

import {
  codexExecutableCandidates,
  CodexStdioTransport,
  CodexTransportError,
  CodexUnixSocketTransport,
  defaultCodexSharedSocketPath,
  type AppServerProcess,
} from "../../src/providers/codex/transport";

class FakeOutput extends EventEmitter {
  push(value: string): void {
    this.emit("data", Buffer.from(value));
  }
}

function fakeProcess() {
  const events = new EventEmitter();
  const stdout = new FakeOutput();
  const writes: string[] = [];
  let killed = false;
  const process = {
    stdin: {
      write: (value: string) => {
        writes.push(value);
        return true;
      },
      end: vi.fn(),
    },
    stdout,
    once: events.once.bind(events),
    kill: () => {
      killed = true;
      return true;
    },
  } as AppServerProcess;
  return {
    process,
    stdout,
    writes,
    emit: events.emit.bind(events),
    wasKilled: () => killed,
  };
}

describe("CodexStdioTransport", () => {
  it("includes GUI-safe bundled and user-local executable candidates without a shell", () => {
    const candidates = codexExecutableCandidates(
      "/synthetic/bin",
      "/synthetic/home",
      "darwin",
    );

    expect(candidates).toEqual(
      expect.arrayContaining([
        "/synthetic/bin/codex",
        "/synthetic/home/.local/bin/codex",
        "/Applications/ChatGPT.app/Contents/Resources/codex",
        "/Applications/Codex.app/Contents/Resources/codex",
      ]),
    );
    expect(candidates.every((candidate) => !candidate.includes(" "))).toBe(
      true,
    );
  });

  it("prefers user-local candidates over an inherited GUI PATH", () => {
    const candidates = codexExecutableCandidates(
      "/Applications/ChatGPT.app/Contents/Resources:/synthetic/bin",
      "/synthetic/home",
      "darwin",
    );

    expect(candidates.slice(0, 3)).toEqual([
      "/synthetic/home/.local/bin/codex",
      "/synthetic/home/.cargo/bin/codex",
      "/synthetic/home/.bun/bin/codex",
    ]);
    expect(candidates.indexOf("/synthetic/home/.local/bin/codex")).toBeLessThan(
      candidates.indexOf("/Applications/ChatGPT.app/Contents/Resources/codex"),
    );
  });

  it("correlates split JSONL responses and sends content-free notifications", async () => {
    const child = fakeProcess();
    const transport = new CodexStdioTransport({
      spawnProcess: () => child.process,
    });
    transport.start();

    const response = transport.request("synthetic/read", { safe: true });
    transport.notify("initialized");
    expect(JSON.parse(child.writes[0]!)).toEqual({
      method: "synthetic/read",
      id: 1,
      params: { safe: true },
    });
    expect(JSON.parse(child.writes[1]!)).toEqual({ method: "initialized" });

    child.stdout.push('{"id":1,"res');
    child.stdout.push('ult":{"ok":true}}\n');
    await expect(response).resolves.toEqual({ ok: true });
  });

  it("ignores notifications and unknown response ids", async () => {
    const child = fakeProcess();
    const transport = new CodexStdioTransport({
      spawnProcess: () => child.process,
    });
    transport.start();
    const response = transport.request("synthetic/read", {});

    child.stdout.push(
      '{"method":"thread/started","params":{"secret":"discard"}}\n',
    );
    child.stdout.push('{"id":99,"result":{"ignored":true}}\n');
    child.stdout.push('{"id":1,"result":{"safe":true}}\n');

    await expect(response).resolves.toEqual({ safe: true });
  });

  it("rejects protocol errors without retaining server error content", async () => {
    const child = fakeProcess();
    const transport = new CodexStdioTransport({
      spawnProcess: () => child.process,
    });
    transport.start();
    const response = transport.request("synthetic/read", {});
    child.stdout.push(
      '{"id":1,"error":{"message":"private provider payload"}}\n',
    );

    await expect(response).rejects.toEqual(new CodexTransportError());
    await expect(response).rejects.not.toThrow("private provider payload");
  });

  it("rejects pending requests on malformed output, exit, and timeout", async () => {
    vi.useFakeTimers();
    try {
      const malformed = fakeProcess();
      const malformedTransport = new CodexStdioTransport({
        spawnProcess: () => malformed.process,
      });
      malformedTransport.start();
      const malformedRequest = malformedTransport.request("read", {});
      malformed.stdout.push("{not-json}\n");
      await expect(malformedRequest).rejects.toBeInstanceOf(
        CodexTransportError,
      );
      expect(malformed.wasKilled()).toBe(true);

      const exited = fakeProcess();
      const exitedTransport = new CodexStdioTransport({
        spawnProcess: () => exited.process,
      });
      exitedTransport.start();
      const exitedRequest = exitedTransport.request("read", {});
      exited.emit("exit");
      await expect(exitedRequest).rejects.toBeInstanceOf(CodexTransportError);

      const timedOut = fakeProcess();
      const timedOutTransport = new CodexStdioTransport({
        requestTimeoutMs: 20,
        spawnProcess: () => timedOut.process,
      });
      timedOutTransport.start();
      const timedOutRequest = timedOutTransport.request("read", {});
      const timedOutExpectation = expect(timedOutRequest).rejects.toMatchObject(
        {
          code: "timeout",
          message: "Codex App Server transport failed",
        },
      );
      await vi.advanceTimersByTimeAsync(20);
      await timedOutExpectation;
    } finally {
      vi.useRealTimers();
    }
  });

  it("stops idempotently and rejects all pending requests", async () => {
    const child = fakeProcess();
    const transport = new CodexStdioTransport({
      spawnProcess: () => child.process,
    });
    transport.start();
    const first = transport.request("first", {});
    const second = transport.request("second", {});
    transport.stop();
    transport.stop();

    await expect(first).rejects.toBeInstanceOf(CodexTransportError);
    await expect(second).rejects.toBeInstanceOf(CodexTransportError);
    expect(child.wasKilled()).toBe(true);
  });
});

class FakeSocket extends EventEmitter {
  readyState = 0;
  readonly writes: string[] = [];

  send(value: string): void {
    this.writes.push(value);
  }

  open(): void {
    this.readyState = 1;
    this.emit("open");
  }

  push(value: string): void {
    this.emit("message", Buffer.from(value));
  }

  close(): void {
    this.readyState = 3;
    this.emit("close");
  }

  terminate(): void {
    this.readyState = 3;
  }
}

describe("CodexUnixSocketTransport", () => {
  it("uses the owner-only default Codex control socket path", () => {
    expect(defaultCodexSharedSocketPath("/synthetic/home")).toBe(
      "/synthetic/home/.codex/app-server-control/app-server-control.sock",
    );
  });

  it("correlates responses while discarding notification payloads", async () => {
    const socket = new FakeSocket();
    let socketAddress: string | undefined;
    let socketOptions: unknown;
    const transport = new CodexUnixSocketTransport({
      socketPath: "/synthetic/control.sock",
      inspectSocket: () => ({
        mode: 0o140600,
        uid: 501,
        isSocket: () => true,
      }),
      currentUid: () => 501,
      createSocket: (address, options) => {
        socketAddress = address;
        socketOptions = options;
        return socket;
      },
    });
    transport.start();
    expect(socketAddress).toBe("ws+unix:///synthetic/control.sock:/rpc");
    expect(socketOptions).toMatchObject({
      handshakeTimeout: 10_000,
      maxPayload: 1_048_576,
      perMessageDeflate: false,
    });
    const response = transport.request("thread/loaded/list", {});
    socket.open();
    await vi.waitFor(() => expect(socket.writes).toHaveLength(1));

    socket.push(
      JSON.stringify({
        method: "item/started",
        params: { prompt: "must be discarded" },
      }),
    );
    socket.push(JSON.stringify({ id: 1, result: { data: [] } }));

    await expect(response).resolves.toEqual({ data: [] });
    transport.notify("initialized");
    expect(JSON.parse(socket.writes[1]!)).toEqual({ method: "initialized" });
    transport.stop();
  });

  it("rejects missing, non-socket, shared, and foreign-owner endpoints", () => {
    const cases = [
      {
        inspectSocket: () => {
          throw new Error("missing");
        },
        code: "socket-unavailable",
      },
      {
        inspectSocket: () => ({
          mode: 0o100600,
          uid: 501,
          isSocket: () => false,
        }),
        code: "socket-permissions",
      },
      {
        inspectSocket: () => ({
          mode: 0o140660,
          uid: 501,
          isSocket: () => true,
        }),
        code: "socket-permissions",
      },
      {
        inspectSocket: () => ({
          mode: 0o140600,
          uid: 777,
          isSocket: () => true,
        }),
        code: "socket-permissions",
      },
    ];

    for (const testCase of cases) {
      const transport = new CodexUnixSocketTransport({
        socketPath: "/synthetic/control.sock",
        inspectSocket: testCase.inspectSocket,
        currentUid: () => 501,
        createSocket: () => new FakeSocket(),
      });
      expect(() => transport.start()).toThrowError(
        expect.objectContaining({ code: testCase.code }),
      );
    }
  });

  it("rejects pending work when the socket closes", async () => {
    const socket = new FakeSocket();
    const transport = new CodexUnixSocketTransport({
      socketPath: "/synthetic/control.sock",
      inspectSocket: () => ({
        mode: 0o140600,
        uid: 501,
        isSocket: () => true,
      }),
      currentUid: () => 501,
      createSocket: () => socket,
    });
    transport.start();
    const response = transport.request("thread/loaded/list", {});
    socket.open();
    await vi.waitFor(() => expect(socket.writes).toHaveLength(1));
    socket.close();
    await expect(response).rejects.toBeInstanceOf(CodexTransportError);
  });
});
