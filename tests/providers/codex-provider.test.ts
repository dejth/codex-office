import { describe, expect, it, vi } from "vitest";

import { CodexProvider } from "../../src/providers/codex/provider";
import type { CodexRpcTransport } from "../../src/providers/codex/transport";

const INITIALIZE = {
  userAgent: "Codex Desktop/0.138.0 synthetic",
  codexHome: "/private/never-retain",
};
const NOW = new Date("2026-07-23T04:00:00.000Z");

class FakeTransport implements CodexRpcTransport {
  readonly calls: Array<{ method: string; params?: unknown }> = [];
  readonly responses = new Map<string, unknown[]>();
  started = 0;
  stopped = 0;

  start(): void {
    this.started += 1;
  }

  request(method: string, params: unknown): Promise<unknown> {
    this.calls.push({ method, params });
    const responses = this.responses.get(method) ?? [];
    const response = responses.shift();
    return response instanceof Error
      ? Promise.reject(response)
      : Promise.resolve(response);
  }

  notify(method: string): void {
    this.calls.push({ method });
  }

  stop(): void {
    this.stopped += 1;
  }

  queue(method: string, ...responses: unknown[]): this {
    this.responses.set(method, responses);
    return this;
  }
}

function thread(
  id: string,
  parentThreadId: string | null,
  status: unknown = { type: "idle" },
  extras: Record<string, unknown> = {},
) {
  return {
    thread: {
      id,
      sessionId: "session-synthetic",
      parentThreadId,
      createdAt: 1_753_243_200,
      status,
      preview: "must be discarded",
      cwd: "/private/workspace",
      turns: [{ prompt: "must be discarded" }],
      ...extras,
    },
  };
}

function configuredTransport(...reads: unknown[]): FakeTransport {
  return new FakeTransport()
    .queue("initialize", INITIALIZE)
    .queue("thread/loaded/list", {
      data: reads.map((read) => (read as { thread: { id: string } }).thread.id),
      nextCursor: null,
      path: "/private/list",
    })
    .queue("thread/read", ...reads);
}

describe("CodexProvider", () => {
  it("ignores a stale initialize after disconnect and reconnect", async () => {
    let rejectFirst: ((error: Error) => void) | undefined;
    const first = new FakeTransport().queue(
      "initialize",
      new Promise((_, reject) => {
        rejectFirst = reject;
      }),
    );
    const second = configuredTransport();
    const transports = [first, second];
    const provider = new CodexProvider(
      () => transports.shift()!,
      () => NOW,
    );

    const staleConnect = provider.connect();
    await provider.disconnect();
    await provider.connect();
    rejectFirst?.(new Error("stale initialize"));
    await staleConnect;

    expect((await provider.snapshot()).connection).toBe("connected");
    expect(second.stopped).toBe(0);
    expect(first.stopped).toBeGreaterThan(0);
  });

  it("initializes without experimental APIs and reads only content-minimized snapshots", async () => {
    const transport = configuredTransport(
      thread("thread-root", null, { type: "active", activeFlags: [] }),
      thread("thread-child", "thread-root", {
        type: "active",
        activeFlags: ["waitingOnApproval"],
      }),
    );
    const provider = new CodexProvider(
      () => transport,
      () => NOW,
    );
    await provider.connect();
    const snapshot = await provider.snapshot();

    expect(transport.calls[0]).toEqual({
      method: "initialize",
      params: {
        clientInfo: {
          name: "codex-office",
          title: "Codex Office",
          version: "0.0.1",
        },
        capabilities: {
          experimentalApi: false,
          requestAttestation: false,
        },
      },
    });
    expect(transport.calls).toContainEqual({ method: "initialized" });
    expect(
      transport.calls.filter(({ method }) => method === "thread/read"),
    ).toEqual([
      {
        method: "thread/read",
        params: { threadId: "thread-root", includeTurns: false },
      },
      {
        method: "thread/read",
        params: { threadId: "thread-child", includeTurns: false },
      },
    ]);
    expect(snapshot.connection).toBe("connected");
    expect(snapshot.agents[0]?.status).toBe("thinking");
    expect(snapshot.agents[0]?.children[0]?.status).toBe("waiting-approval");
    expect(snapshot.agents[0]?.usage).toBeNull();
    expect(JSON.stringify(snapshot)).not.toMatch(
      /private|prompt|preview|cwd|turns/,
    );
  });

  it("maps every available thread status conservatively", async () => {
    const transport = configuredTransport(
      thread("active", null, { type: "active", activeFlags: [] }),
      thread("approval", null, {
        type: "active",
        activeFlags: ["waitingOnUserInput"],
      }),
      thread("idle", null, { type: "idle" }),
      thread("failed", null, { type: "systemError" }),
      thread("unknown", null, { type: "notLoaded" }),
    );
    const provider = new CodexProvider(
      () => transport,
      () => NOW,
    );
    await provider.connect();
    const result = await provider.snapshot();
    expect(
      Object.fromEntries(
        result.agents.map((agent) => [agent.id, agent.status]),
      ),
    ).toEqual({
      active: "thinking",
      approval: "waiting-approval",
      failed: "failed",
      idle: "idle",
      unknown: "unknown",
    });
  });

  it("paginates loaded ids and rejects cursor cycles", async () => {
    const transport = new FakeTransport()
      .queue("initialize", INITIALIZE)
      .queue(
        "thread/loaded/list",
        { data: ["root"], nextCursor: "next" },
        { data: ["child"], nextCursor: null },
      )
      .queue("thread/read", thread("root", null), thread("child", "root"));
    const provider = new CodexProvider(
      () => transport,
      () => NOW,
    );
    await provider.connect();
    expect((await provider.snapshot()).agents[0]?.children).toHaveLength(1);
    expect(
      transport.calls.filter(({ method }) => method === "thread/loaded/list"),
    ).toEqual([
      {
        method: "thread/loaded/list",
        params: { cursor: null, limit: 100 },
      },
      {
        method: "thread/loaded/list",
        params: { cursor: "next", limit: 100 },
      },
    ]);
  });

  it("publishes authoritative empty snapshots and notifies subscribers", async () => {
    const transport = configuredTransport();
    const provider = new CodexProvider(
      () => transport,
      () => NOW,
    );
    const listener = vi.fn();
    const unsubscribe = provider.subscribe(listener);
    await provider.connect();

    const snapshot = await provider.snapshot();
    expect(snapshot).toEqual({
      sessionId: null,
      updatedAt: NOW.toISOString(),
      agents: [],
      connection: "connected",
    });
    expect(listener).toHaveBeenCalledWith(snapshot);
    unsubscribe();
  });

  it("degrades unsupported versions without reading threads", async () => {
    const transport = new FakeTransport().queue("initialize", {
      userAgent: "Codex Desktop/0.139.0 synthetic",
    });
    const provider = new CodexProvider(
      () => transport,
      () => NOW,
    );
    await provider.connect();
    const snapshot = await provider.snapshot();

    expect(snapshot.connection).toBe("degraded");
    expect(transport.stopped).toBe(1);
    expect(
      transport.calls.some(({ method }) => method.startsWith("thread/")),
    ).toBe(false);
  });

  it("preserves the last safe timestamped hierarchy when refresh data is malformed", async () => {
    const transport = configuredTransport(thread("safe-root", null));
    const provider = new CodexProvider(
      () => transport,
      () => NOW,
    );
    await provider.connect();
    const safe = await provider.snapshot();

    transport.queue("thread/loaded/list", {
      data: ["unsafe"],
      nextCursor: null,
    });
    transport.queue("thread/read", {
      thread: {
        id: "unsafe",
        sessionId: "session",
        parentThreadId: null,
        createdAt: 1,
        status: { type: "futureStatus" },
        secret: "never expose",
      },
    });
    const degraded = await provider.refresh();

    expect(degraded.agents).toEqual(safe.agents);
    expect(degraded.updatedAt).toBe(safe.updatedAt);
    expect(degraded.connection).toBe("degraded");
    expect(JSON.stringify(degraded)).not.toContain("never expose");
  });

  it("degrades rather than linking relationships across sessions", async () => {
    const transport = configuredTransport(
      thread("root", null),
      thread("child", "root", { type: "idle" }, { sessionId: "session-other" }),
    );
    const provider = new CodexProvider(
      () => transport,
      () => NOW,
    );
    await provider.connect();
    const snapshot = await provider.snapshot();

    expect(snapshot.connection).toBe("degraded");
    expect(snapshot.agents).toHaveLength(1);
    expect(snapshot.agents[0]?.children).toEqual([]);
  });

  it("rejects a thread/read response whose id differs from the request", async () => {
    const transport = new FakeTransport()
      .queue("initialize", INITIALIZE)
      .queue("thread/loaded/list", {
        data: ["expected"],
        nextCursor: null,
      })
      .queue("thread/read", thread("unexpected", null));
    const provider = new CodexProvider(
      () => transport,
      () => NOW,
    );
    await provider.connect();

    expect((await provider.snapshot()).connection).toBe("degraded");
    expect((await provider.snapshot()).agents).toEqual([]);
  });

  it("coalesces overlapping refreshes and disposes idempotently", async () => {
    let resolveList!: (value: unknown) => void;
    const pendingList = new Promise((resolve) => {
      resolveList = resolve;
    });
    const transport = new FakeTransport()
      .queue("initialize", INITIALIZE)
      .queue("thread/loaded/list", pendingList);
    const provider = new CodexProvider(
      () => transport,
      () => NOW,
    );
    const connecting = provider.connect();
    const refresh = provider.refresh();
    resolveList({ data: [], nextCursor: null });
    await Promise.all([connecting, refresh]);

    expect(
      transport.calls.filter(({ method }) => method === "thread/loaded/list"),
    ).toHaveLength(1);
    await provider.disconnect();
    await provider.disconnect();
    expect(transport.stopped).toBe(1);
    expect((await provider.snapshot()).connection).toBe("disconnected");
  });
});
