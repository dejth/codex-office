import { describe, expect, it, vi } from "vitest";

import { CodexProvider } from "../../src/providers/codex/provider";
import {
  CodexTransportError,
  type CodexRpcTransport,
} from "../../src/providers/codex/transport";

const INITIALIZE = {
  userAgent: "Codex Desktop/0.145.0 synthetic",
  codexHome: "/private/never-retain",
};
const NOW = new Date("2026-07-23T04:00:00.000Z");
const DISCOVERY_SOURCES = [
  "cli",
  "vscode",
  "exec",
  "appServer",
  "subAgent",
  "subAgentReview",
  "subAgentCompact",
  "subAgentThreadSpawn",
  "subAgentOther",
];

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
    id,
    sessionId: "session-synthetic",
    parentThreadId,
    createdAt: 1_753_243_200,
    status,
    preview: "must be discarded",
    cwd: "/private/workspace",
    turns: [{ prompt: "must be discarded" }],
    ...extras,
  };
}

function configuredTransport(...reads: unknown[]): FakeTransport {
  return new FakeTransport()
    .queue("initialize", INITIALIZE)
    .queue("thread/list", {
      data: reads,
      nextCursor: null,
      path: "/private/list",
    });
}

describe("CodexProvider", () => {
  it("does not start transport when workspace-scoped discovery has no workspace", async () => {
    const transport = configuredTransport(thread("global-thread", null));
    const provider = new CodexProvider(
      () => transport,
      () => NOW,
      undefined,
      true,
    );

    await provider.connect();

    expect(transport.started).toBe(0);
    expect(transport.calls).toEqual([]);
    expect(provider.diagnostic()).toBe("workspace-required");
    expect(await provider.snapshot()).toMatchObject({
      agents: [],
      connection: "disconnected",
    });
  });

  it("resolves a workspace that becomes available after activation", async () => {
    const transport = configuredTransport(thread("workspace-thread", null));
    const workspace = { cwd: undefined as string | undefined };
    const provider = new CodexProvider(
      () => transport,
      () => NOW,
      () => workspace.cwd,
      true,
    );

    await provider.connect();
    expect(provider.diagnostic()).toBe("workspace-required");
    expect(transport.started).toBe(0);

    workspace.cwd = "/synthetic/workspace";
    await provider.connect();

    expect(provider.diagnostic()).toBe("none");
    expect(transport.started).toBe(1);
    expect(
      transport.calls.find(({ method }) => method === "thread/list"),
    ).toMatchObject({
      params: { cwd: "/synthetic/workspace" },
    });
  });

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

  it("discovers state-db threads without experimental APIs and strips content", async () => {
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
          optOutNotificationMethods: expect.arrayContaining([
            "item/started",
            "item/agentMessage/delta",
            "item/commandExecution/outputDelta",
            "item/fileChange/patchUpdated",
            "item/reasoning/textDelta",
            "thread/realtime/transcript/delta",
          ]),
        },
      },
    });
    const initialize = transport.calls[0]?.params as {
      capabilities?: { optOutNotificationMethods?: string[] };
    };
    expect(
      new Set(initialize.capabilities?.optOutNotificationMethods).size,
    ).toBe(initialize.capabilities?.optOutNotificationMethods?.length);
    expect(transport.calls).toContainEqual({ method: "initialized" });
    expect(transport.calls).toContainEqual({
      method: "thread/list",
      params: {
        cursor: null,
        limit: 100,
        cwd: null,
        sourceKinds: DISCOVERY_SOURCES,
        useStateDbOnly: true,
      },
    });
    expect(transport.calls.some(({ method }) => method === "thread/read")).toBe(
      false,
    );
    expect(snapshot.connection).toBe("connected");
    expect(snapshot.agents[0]?.status).toBe("thinking");
    expect(snapshot.agents[0]?.children[0]?.status).toBe("waiting-approval");
    expect(snapshot.agents[0]?.usage).toBeNull();
    expect(JSON.stringify(snapshot)).not.toMatch(
      /private|prompt|preview|cwd|turns/,
    );
  });

  it("overlays shared loaded-thread status without resuming or retaining content", async () => {
    const transport = configuredTransport(
      thread("thread-root", null, { type: "notLoaded" }),
      thread("thread-child", "thread-root", { type: "notLoaded" }),
    )
      .queue("thread/loaded/list", {
        data: ["thread-root", "thread-child", "outside-workspace"],
        nextCursor: null,
      })
      .queue(
        "thread/read",
        {
          thread: {
            id: "thread-root",
            status: { type: "active", activeFlags: [] },
            cwd: "/private/never-retain",
            turns: [{ prompt: "must be discarded" }],
          },
        },
        {
          thread: {
            id: "thread-child",
            status: {
              type: "active",
              activeFlags: ["waitingOnApproval"],
            },
            preview: "must be discarded",
          },
        },
      );
    const provider = new CodexProvider(
      () => transport,
      () => NOW,
      "/synthetic/workspace",
      false,
      true,
    );

    await provider.connect();
    const snapshot = await provider.snapshot();

    expect(snapshot.agents[0]?.status).toBe("thinking");
    expect(snapshot.agents[0]?.children[0]?.status).toBe("waiting-approval");
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
    expect(JSON.stringify(snapshot)).not.toMatch(
      /outside-workspace|private|prompt|preview|cwd|turns/,
    );
  });

  it("falls back to private snapshots when shared transport initialization fails", async () => {
    const shared = new FakeTransport();
    shared.start = () => {
      shared.started += 1;
      throw new CodexTransportError("socket-unavailable");
    };
    const fallback = configuredTransport(
      thread("thread-root", null, { type: "notLoaded" }),
    );
    const provider = new CodexProvider(
      () => shared,
      () => NOW,
      "/synthetic/workspace",
      false,
      true,
      () => fallback,
    );

    await provider.connect();
    const snapshot = await provider.snapshot();

    expect(shared.started).toBe(1);
    expect(shared.stopped).toBeGreaterThan(0);
    expect(fallback.started).toBe(1);
    expect(
      fallback.calls.some(({ method }) => method === "thread/loaded/list"),
    ).toBe(false);
    expect(snapshot).toMatchObject({
      connection: "connected",
      agents: [{ id: "thread-root", status: "unknown" }],
    });
    expect(provider.diagnostic()).toBe("none");
  });

  it("fails closed to persisted unreported status when shared metadata is malformed", async () => {
    const transport = configuredTransport(
      thread("thread-root", null, { type: "notLoaded" }),
    )
      .queue("thread/loaded/list", {
        data: ["thread-root"],
        nextCursor: null,
      })
      .queue("thread/read", {
        thread: {
          id: "thread-root",
          status: { type: "future-status", raw: "must be discarded" },
          turns: [{ prompt: "must be discarded" }],
        },
      });
    const provider = new CodexProvider(
      () => transport,
      () => NOW,
      "/synthetic/workspace",
      false,
      true,
    );

    await provider.connect();
    const snapshot = await provider.snapshot();

    expect(snapshot.connection).toBe("connected");
    expect(snapshot.agents[0]?.status).toBe("unknown");
    expect(JSON.stringify(snapshot)).not.toMatch(/future-status|prompt|turns/);
  });

  it("reconstructs state-db subagent edges from versioned spawn metadata", async () => {
    const transport = configuredTransport(
      thread("thread-root", null, { type: "notLoaded" }),
      thread(
        "thread-child",
        null,
        { type: "notLoaded" },
        {
          sessionId: "child-session",
          source: {
            subAgent: {
              thread_spawn: {
                parent_thread_id: "thread-root",
                depth: 1,
                agent_path: "/private/never-project",
                agent_nickname: "Kepler",
                agent_role: "explorer",
              },
            },
          },
          agentNickname: "Kepler",
          agentRole: "explorer",
        },
      ),
    );
    const provider = new CodexProvider(
      () => transport,
      () => NOW,
    );

    await provider.connect();
    const snapshot = await provider.snapshot();

    expect(snapshot.connection).toBe("connected");
    expect(snapshot.agents).toHaveLength(1);
    expect(snapshot.agents[0]?.children).toHaveLength(1);
    expect(snapshot.agents[0]?.children[0]).toMatchObject({
      id: "thread-child",
      parentId: "thread-root",
      name: "Codex agent",
      displayName: "Kepler",
      status: "unknown",
    });
    expect(JSON.stringify(snapshot)).not.toMatch(/private|agent_path|explorer/);
  });

  it("fails closed when a spawn parent is absent from the bounded workspace", async () => {
    const transport = configuredTransport(
      thread(
        "orphan-child",
        null,
        { type: "notLoaded" },
        {
          source: {
            subAgent: {
              thread_spawn: {
                parent_thread_id: "outside-workspace",
                depth: 1,
                agent_path: null,
                agent_nickname: "Noether",
                agent_role: null,
              },
            },
          },
        },
      ),
    );
    const provider = new CodexProvider(
      () => transport,
      () => NOW,
    );

    await provider.connect();

    expect((await provider.snapshot()).connection).toBe("degraded");
    expect((await provider.snapshot()).agents).toEqual([]);
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

  it("projects only bounded reported account-capacity windows", async () => {
    const transport = configuredTransport(thread("root", null)).queue(
      "account/rateLimits/read",
      {
        rateLimits: {
          limitId: "must-be-discarded",
          primary: {
            usedPercent: 38.5,
            windowDurationMins: 300,
            resetsAt: 1_753_261_200,
          },
          secondary: {
            usedPercent: 62,
            windowDurationMins: 10_080,
            resetsAt: null,
          },
          credits: {
            balance: "private-credit-balance",
          },
        },
        rateLimitsByLimitId: {
          private: { secret: "must-be-discarded" },
        },
      },
    );
    const provider = new CodexProvider(
      () => transport,
      () => NOW,
    );

    await provider.connect();
    const snapshot = await provider.snapshot();

    expect(transport.calls).toContainEqual({
      method: "account/rateLimits/read",
      params: {},
    });
    expect(snapshot.rateLimits).toEqual({
      primary: {
        usedPercent: 38.5,
        windowDurationMinutes: 300,
        resetsAt: "2025-07-23T09:00:00.000Z",
      },
      secondary: {
        usedPercent: 62,
        windowDurationMinutes: 10_080,
        resetsAt: null,
      },
      provenance: "reported",
    });
    expect(JSON.stringify(snapshot)).not.toMatch(
      /limitId|credit|balance|private|secret/,
    );
  });

  it("keeps hierarchy available when account capacity is malformed", async () => {
    const transport = configuredTransport(thread("root", null)).queue(
      "account/rateLimits/read",
      {
        rateLimits: {
          primary: {
            usedPercent: 101,
            windowDurationMins: 300,
            resetsAt: null,
          },
          secondary: null,
        },
      },
    );
    const provider = new CodexProvider(
      () => transport,
      () => NOW,
    );

    await provider.connect();
    const snapshot = await provider.snapshot();

    expect(snapshot.connection).toBe("connected");
    expect(snapshot.agents).toHaveLength(1);
    expect(snapshot.rateLimits).toBeNull();
  });

  it("paginates persisted threads with the exact workspace filter", async () => {
    const transport = new FakeTransport()
      .queue("initialize", INITIALIZE)
      .queue(
        "thread/list",
        { data: [thread("root", null)], nextCursor: "next" },
        { data: [thread("child", "root")], nextCursor: null },
      );
    const provider = new CodexProvider(
      () => transport,
      () => NOW,
      "/synthetic/workspace",
    );
    await provider.connect();
    expect((await provider.snapshot()).agents[0]?.children).toHaveLength(1);
    expect(
      transport.calls.filter(({ method }) => method === "thread/list"),
    ).toEqual([
      {
        method: "thread/list",
        params: {
          cursor: null,
          limit: 100,
          cwd: "/synthetic/workspace",
          sourceKinds: DISCOVERY_SOURCES,
          useStateDbOnly: true,
        },
      },
      {
        method: "thread/list",
        params: {
          cursor: "next",
          limit: 100,
          cwd: "/synthetic/workspace",
          sourceKinds: DISCOVERY_SOURCES,
          useStateDbOnly: true,
        },
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
      rateLimits: null,
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
    expect(provider.diagnostic()).toBe("unsupported-version");
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

    transport.queue("thread/list", {
      data: [
        {
          id: "unsafe",
          sessionId: "session",
          parentThreadId: null,
          createdAt: 1,
          status: { type: "futureStatus" },
          secret: "never expose",
        },
      ],
      nextCursor: null,
    });
    const degraded = await provider.refresh();

    expect(degraded.agents).toEqual(safe.agents);
    expect(degraded.updatedAt).toBe(safe.updatedAt);
    expect(degraded.connection).toBe("degraded");
    expect(provider.diagnostic()).toBe("invalid-provider-data");
    expect(JSON.stringify(degraded)).not.toContain("never expose");
  });

  it("preserves a bounded executable-unavailable diagnostic", async () => {
    const transport = new FakeTransport();
    transport.start = () => {
      throw new CodexTransportError("executable-not-found");
    };
    const provider = new CodexProvider(() => transport);

    await provider.connect();

    expect((await provider.snapshot()).connection).toBe("degraded");
    expect(provider.diagnostic()).toBe("executable-unavailable");
    expect(JSON.stringify(provider.diagnostic())).not.toContain("/");
  });

  it("reconnects after a runtime transport failure", async () => {
    const first = configuredTransport(thread("first", null));
    const second = configuredTransport(thread("second", null));
    const transports = [first, second];
    const provider = new CodexProvider(
      () => transports.shift()!,
      () => NOW,
    );
    await provider.connect();
    first.queue("thread/list", new CodexTransportError("protocol-failed"));

    expect((await provider.refresh()).connection).toBe("degraded");
    expect(provider.diagnostic()).toBe("transport-unavailable");
    expect(first.stopped).toBeGreaterThan(0);

    await provider.connect();
    const recovered = await provider.snapshot();
    expect(recovered.connection).toBe("connected");
    expect(recovered.agents[0]?.id).toBe("second");
    expect(provider.diagnostic()).toBe("none");
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

  it("rejects conflicting duplicate thread ids across pages", async () => {
    const transport = new FakeTransport().queue("initialize", INITIALIZE).queue(
      "thread/list",
      { data: [thread("duplicate", null)], nextCursor: "next" },
      {
        data: [
          thread(
            "duplicate",
            null,
            { type: "idle" },
            {
              sessionId: "conflicting-session",
            },
          ),
        ],
        nextCursor: null,
      },
    );
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
      .queue("thread/list", pendingList);
    const provider = new CodexProvider(
      () => transport,
      () => NOW,
    );
    const connecting = provider.connect();
    const refresh = provider.refresh();
    resolveList({ data: [], nextCursor: null });
    await Promise.all([connecting, refresh]);

    expect(
      transport.calls.filter(({ method }) => method === "thread/list"),
    ).toHaveLength(1);
    await provider.disconnect();
    await provider.disconnect();
    expect(transport.stopped).toBe(1);
    expect((await provider.snapshot()).connection).toBe("disconnected");
  });
});
