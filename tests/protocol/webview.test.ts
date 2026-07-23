import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  parseHostToWebviewMessage,
  parseWebviewToHostMessage,
  projectOfficeSnapshot,
  shouldAcceptHostSequence,
} from "../../src/protocol/webview";
import { buildAgentHierarchy } from "../../src/domain/hierarchy";
import type { OfficeSnapshot } from "../../src/domain/model";
import type { ProjectionResult } from "../../src/protocol/webview";

const V = 1;
const node = (id = "agent-1", children: unknown[] = []) => ({
  id,
  name: "Agent",
  status: "idle",
  usage: null,
  children,
});
const snapshot = {
  id: "snapshot-1",
  updatedAt: "2026-01-01T00:00:00.000Z",
  agents: [node()],
  unresolved: [],
  connection: "connected",
};

describe("webview protocol", () => {
  it.each([
    { protocolVersion: V, sequence: 1, type: "snapshot", snapshot },
    {
      protocolVersion: V,
      sequence: 2,
      type: "connection",
      state: "degraded",
      reason: "usage-unavailable",
    },
    {
      protocolVersion: V,
      sequence: 3,
      type: "connection",
      state: "degraded",
      reason: "provider-executable-unavailable",
    },
    {
      protocolVersion: V,
      sequence: 4,
      type: "connection",
      state: "degraded",
      reason: "provider-transport-unavailable",
    },
    {
      protocolVersion: V,
      sequence: 5,
      type: "settings",
      defaultView: "office",
      reducedMotion: true,
    },
    { protocolVersion: V, sequence: 6, type: "refresh-requested" },
  ])("accepts every host message type", (message) => {
    expect(parseHostToWebviewMessage(message)).toEqual({ ok: true, message });
  });

  it.each([
    { protocolVersion: V, type: "ready" },
    { protocolVersion: V, type: "select-agent", agentId: "agent-1" },
    { protocolVersion: V, type: "set-view", view: "meter" },
    { protocolVersion: V, type: "refresh" },
    { protocolVersion: V, type: "open-settings" },
  ])("accepts every webview message type", (message) => {
    expect(parseWebviewToHostMessage(message)).toEqual({ ok: true, message });
  });

  it("loads a synthetic Issue #2 fixture into a valid snapshot", () => {
    const fixture = JSON.parse(
      readFileSync(
        new URL(
          "../fixtures/codex/corpus/01-nested-subagents.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ) as { expected: { agents: unknown[] } };
    const projected = projectOfficeSnapshot({
      sessionId: "raw-session",
      updatedAt: snapshot.updatedAt,
      agents: fixture.expected.agents as OfficeSnapshot["agents"],
      connection: "connected",
    });
    expect(projected.ok).toBe(true);
    if (!projected.ok) throw new Error("fixture projection failed");
    const message = {
      protocolVersion: V,
      sequence: 1,
      type: "snapshot",
      snapshot: projected.snapshot,
    };
    expect(parseHostToWebviewMessage(message).ok).toBe(true);
  });

  it("returns content-free failures for version, type, and malformed fields", () => {
    expect(
      parseWebviewToHostMessage({ protocolVersion: 2, type: "ready" }),
    ).toEqual({
      ok: false,
      reason: "unsupported-version",
    });
    expect(
      parseWebviewToHostMessage({
        protocolVersion: V,
        type: "future",
        secret: "raw",
      }),
    ).toEqual({
      ok: false,
      reason: "unknown-type",
    });
    expect(
      parseWebviewToHostMessage({
        protocolVersion: V,
        type: "select-agent",
        agentId: 7,
      }),
    ).toEqual({
      ok: false,
      reason: "invalid-message",
    });
  });

  it("rejects stale or replayed host sequences per message type", () => {
    expect(shouldAcceptHostSequence(undefined, 4)).toBe(true);
    expect(shouldAcceptHostSequence(4, 5)).toBe(true);
    expect(shouldAcceptHostSequence(4, 4)).toBe(false);
    expect(shouldAcceptHostSequence(4, 3)).toBe(false);
  });

  it("rejects forbidden extras without echoing them", () => {
    const secret = "/Users/private/workspace";
    const result = parseHostToWebviewMessage({
      protocolVersion: V,
      sequence: 1,
      type: "snapshot",
      snapshot,
      codexHome: secret,
    });
    expect(result).toEqual({ ok: false, reason: "invalid-message" });
    expect(JSON.stringify(result)).not.toContain(secret);

    const rawDomainFields = parseHostToWebviewMessage({
      protocolVersion: V,
      sequence: 1,
      type: "snapshot",
      snapshot: {
        ...snapshot,
        sessionId: "raw-session",
        agents: [{ ...node(), parentId: "raw-parent", task: "raw task" }],
      },
    });
    expect(rawDomainFields).toEqual({ ok: false, reason: "invalid-message" });
  });

  it.each([Number.MAX_SAFE_INTEGER + 1, -1, 1.5])(
    "rejects unsafe token value %s",
    (total) => {
      const message = {
        protocolVersion: V,
        sequence: 1,
        type: "snapshot",
        snapshot: {
          ...snapshot,
          agents: [
            {
              ...node(),
              usage: {
                input: 1,
                cachedInput: 0,
                output: 1,
                total,
                provenance: "reported",
              },
            },
          ],
        },
      };
      expect(parseHostToWebviewMessage(message).ok).toBe(false);
    },
  );

  it("enforces canonical timestamps", () => {
    const result = parseHostToWebviewMessage({
      protocolVersion: V,
      sequence: 1,
      type: "snapshot",
      snapshot: { ...snapshot, updatedAt: "2026-01-01T00:00:00" },
    });
    expect(result).toEqual({ ok: false, reason: "invalid-message" });
  });

  it("accepts depth 32 and rejects depth 33 and excess count", () => {
    const treeAtDepth = (depth: number): ReturnType<typeof node> => {
      let deep = node(`agent-${depth}`);
      for (let level = depth - 1; level >= 1; level -= 1)
        deep = node(`agent-${level}`, [deep]);
      return deep;
    };
    const atLimit = parseHostToWebviewMessage({
      protocolVersion: V,
      sequence: 1,
      type: "snapshot",
      snapshot: { ...snapshot, agents: [treeAtDepth(32)] },
    });
    const tooDeep = parseHostToWebviewMessage({
      protocolVersion: V,
      sequence: 1,
      type: "snapshot",
      snapshot: { ...snapshot, agents: [treeAtDepth(33)] },
    });
    const tooMany = parseHostToWebviewMessage({
      protocolVersion: V,
      sequence: 1,
      type: "snapshot",
      snapshot: {
        ...snapshot,
        agents: Array.from({ length: 1_001 }, (_, index) => node(`a-${index}`)),
      },
    });
    expect(atLimit.ok).toBe(true);
    expect(tooDeep.ok).toBe(false);
    expect(tooMany.ok).toBe(false);
  });

  it("rejects duplicate opaque IDs across trees and unresolved", () => {
    const duplicateTree = {
      ...snapshot,
      agents: [node("same"), node("same")],
    };
    const duplicateUnresolved = {
      ...snapshot,
      unresolved: [{ id: "agent-1", reason: "cycle" }],
    };
    for (const value of [duplicateTree, duplicateUnresolved]) {
      expect(
        parseHostToWebviewMessage({
          protocolVersion: V,
          sequence: 1,
          type: "snapshot",
          snapshot: value,
        }).ok,
      ).toBe(false);
    }
  });

  it("accepts bounded Unicode names and rejects controls, bidi, and code-point overflow", () => {
    const valid = { ...snapshot, agents: [{ ...node(), name: "ทีมพัฒนา 👩🏽‍💻" }] };
    expect(
      parseHostToWebviewMessage({
        protocolVersion: V,
        sequence: 1,
        type: "snapshot",
        snapshot: valid,
      }).ok,
    ).toBe(true);
    for (const name of [
      "line\nbreak",
      "nul\0name",
      "bidi\u202ename",
      "😀".repeat(101),
    ]) {
      const unsafe = { ...snapshot, agents: [{ ...node(), name }] };
      expect(
        parseHostToWebviewMessage({
          protocolVersion: V,
          sequence: 1,
          type: "snapshot",
          snapshot: unsafe,
        }).ok,
      ).toBe(false);
    }
    const boundary = {
      ...snapshot,
      agents: [{ ...node(), name: "😀".repeat(100) }],
    };
    expect(
      parseHostToWebviewMessage({
        protocolVersion: V,
        sequence: 1,
        type: "snapshot",
        snapshot: boundary,
      }).ok,
    ).toBe(true);
  });

  it("projects sensitive domain data to fresh opaque IDs and generated labels", () => {
    const canary = "/Users/private/raw-agent-secret";
    const usage = {
      input: 2,
      cachedInput: 1,
      output: 3,
      total: 5,
      provenance: "reported" as const,
    };
    const source: OfficeSnapshot = {
      sessionId: `${canary}-session`,
      updatedAt: snapshot.updatedAt,
      connection: "connected",
      agents: [
        {
          id: `${canary}-root`,
          parentId: null,
          name: `${canary}-name`,
          task: `${canary}-task`,
          status: "idle",
          usage,
          children: [
            {
              id: `${canary}-child`,
              parentId: `${canary}-root`,
              name: "raw child",
              task: canary,
              status: "unknown",
              usage: null,
              children: [],
            },
          ],
        },
      ],
    };
    const result = projectOfficeSnapshot(source, [
      { id: `${canary}-unresolved`, reason: "missing-parent" },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("projection failed");
    expect(JSON.stringify(result.snapshot)).not.toContain(canary);
    expect(result.snapshot.agents[0]).toMatchObject({
      id: "agent_0002",
      name: "Agent 2",
    });
    expect(result.snapshot.agents[0]?.usage).not.toBe(usage);
    expect(result.domainIdByOpaqueId.get("agent_0002")).toBe(`${canary}-root`);
    expect(JSON.stringify(result.snapshot)).not.toContain(source.sessionId!);
  });

  it("projects duplicate unresolved occurrences to distinct opaque IDs", () => {
    const duplicate = {
      id: "raw-duplicate",
      parentId: null,
      name: "Raw duplicate",
      task: null,
      status: "idle" as const,
      usage: null,
      startedAt: null,
    };
    const hierarchy = buildAgentHierarchy([duplicate, { ...duplicate }]);
    const source: OfficeSnapshot = {
      sessionId: "raw-session",
      updatedAt: snapshot.updatedAt,
      connection: "connected",
      agents: hierarchy.agents,
    };
    const result = projectOfficeSnapshot(
      source,
      hierarchy.unresolved.map(({ agent, reason }) => ({
        id: agent.id,
        reason,
      })),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("projection failed");
    expect(result.snapshot.unresolved.map(({ id }) => id)).toEqual([
      "agent_0001",
      "agent_0002",
    ]);
    expect([...result.domainIdByOpaqueId.values()]).toEqual([
      "raw-duplicate",
      "raw-duplicate",
    ]);
  });

  it("projects depth 32 and rejects depth 33", () => {
    const projectAtDepth = (depth: number): ProjectionResult => {
      let root = node(`raw-${depth}`) as OfficeSnapshot["agents"][number];
      for (let level = depth - 1; level >= 1; level -= 1)
        root = node(`raw-${level}`, [root]) as OfficeSnapshot["agents"][number];
      return projectOfficeSnapshot({
        sessionId: "raw-session",
        updatedAt: snapshot.updatedAt,
        connection: "connected",
        agents: [root],
      });
    };
    expect(projectAtDepth(32).ok).toBe(true);
    expect(projectAtDepth(33)).toEqual({ ok: false, reason: "source-limit" });
  });

  it("fails projection content-free for cycles and source limits", () => {
    const cyclic = node("raw-cycle") as OfficeSnapshot["agents"][number];
    cyclic.children.push(cyclic);
    const base = {
      sessionId: null,
      updatedAt: snapshot.updatedAt,
      connection: "connected" as const,
    };
    expect(projectOfficeSnapshot({ ...base, agents: [cyclic] })).toEqual({
      ok: false,
      reason: "invalid-source",
    });
    expect(
      projectOfficeSnapshot({
        ...base,
        agents: Array.from({ length: 1_001 }, (_, index) =>
          node(`raw-${index}`),
        ) as OfficeSnapshot["agents"],
      }),
    ).toEqual({ ok: false, reason: "source-limit" });
  });

  it("rejects cycles, prototype keys, accessors, and oversized strings before parsing", () => {
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    const polluted = JSON.parse(
      '{"protocolVersion":1,"type":"ready","__proto__":{"polluted":true}}',
    );
    const accessor = Object.defineProperty(
      { protocolVersion: V, type: "ready" },
      "secret",
      { get: () => "x" },
    );
    for (const input of [
      cyclic,
      polluted,
      accessor,
      { protocolVersion: V, type: "select-agent", agentId: "x".repeat(4_097) },
    ]) {
      expect(parseWebviewToHostMessage(input)).toEqual({
        ok: false,
        reason: "payload-limit",
      });
    }
  });

  it("never throws when parser reflection is trapped", () => {
    const secret = "raw-proxy-secret";
    const hostile = new Proxy(
      { protocolVersion: V, type: "ready", secret },
      {
        getPrototypeOf: () => {
          throw new Error(secret);
        },
      },
    );
    expect(() => parseWebviewToHostMessage(hostile)).not.toThrow();
    const result = parseWebviewToHostMessage(hostile);
    expect(result).toEqual({ ok: false, reason: "invalid-message" });
    expect(JSON.stringify(result)).not.toContain(secret);
  });

  it("never throws on hostile projection input and rejects raw tree ID collisions", () => {
    const secret = "projection-proxy-secret";
    const hostile = new Proxy({} as OfficeSnapshot, {
      getPrototypeOf: () => {
        throw new Error(secret);
      },
    });
    expect(() => projectOfficeSnapshot(hostile)).not.toThrow();
    const hostileResult = projectOfficeSnapshot(hostile);
    expect(hostileResult).toEqual({ ok: false, reason: "invalid-source" });
    expect(JSON.stringify(hostileResult)).not.toContain(secret);

    const accessor = Object.defineProperty({}, "updatedAt", {
      get: () => {
        throw new Error(secret);
      },
    }) as OfficeSnapshot;
    expect(projectOfficeSnapshot(accessor)).toEqual({
      ok: false,
      reason: "invalid-source",
    });

    const duplicateId = "raw-domain-id";
    const source: OfficeSnapshot = {
      sessionId: null,
      updatedAt: snapshot.updatedAt,
      connection: "connected",
      agents: [
        {
          id: duplicateId,
          parentId: null,
          name: "raw",
          task: null,
          status: "idle",
          usage: null,
          children: [],
        },
        {
          id: duplicateId,
          parentId: null,
          name: "raw duplicate",
          task: null,
          status: "idle",
          usage: null,
          children: [],
        },
      ],
    };
    expect(projectOfficeSnapshot(source)).toEqual({
      ok: false,
      reason: "invalid-source",
    });
  });

  it("parses deterministically", () => {
    const message = {
      protocolVersion: V,
      sequence: 1,
      type: "snapshot",
      snapshot,
    };
    expect(parseHostToWebviewMessage(message)).toEqual(
      parseHostToWebviewMessage(message),
    );
  });
});
