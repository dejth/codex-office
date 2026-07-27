import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  buildAgentHierarchy,
  type HierarchyAgent,
} from "../../src/domain/hierarchy";

const START = "2026-01-01T00:00:00.000Z";

function agent(
  id: string,
  parentId: string | null,
  overrides: Partial<HierarchyAgent> = {},
): HierarchyAgent {
  return {
    id,
    parentId,
    name: id,
    task: null,
    status: "idle",
    lastActivityAt: null,
    usage: null,
    startedAt: START,
    ...overrides,
  };
}

function expectPermutationInvariant(input: HierarchyAgent[]): void {
  const expected = buildAgentHierarchy(input);
  for (const seed of [1, 7, 29]) {
    const shuffled = [...input];
    let state = seed;
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      state = (state * 1664525 + 1013904223) >>> 0;
      const target = state % (index + 1);
      [shuffled[index], shuffled[target]] = [
        shuffled[target]!,
        shuffled[index]!,
      ];
    }
    expect(buildAgentHierarchy(shuffled)).toEqual(expected);
  }
}

describe("buildAgentHierarchy", () => {
  it("builds empty and single-root hierarchies", () => {
    expect(buildAgentHierarchy([])).toEqual({
      agents: [],
      unresolved: [],
      diagnostics: [],
    });
    expect(buildAgentHierarchy([agent("root", null)]).agents[0]).toMatchObject({
      id: "root",
      parentId: null,
      children: [],
    });
  });

  it("loads the Issue #2 fixture to build three nested levels", () => {
    const fixture = JSON.parse(
      readFileSync(
        new URL(
          "../fixtures/codex/corpus/01-nested-subagents.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ) as {
      input: Array<{
        receivedAt: string;
        thread: {
          id: string;
          parentThreadId: string | null;
          status: { type: string };
        };
      }>;
    };
    const input = fixture.input.map(({ receivedAt, thread }) =>
      agent(thread.id, thread.parentThreadId, {
        name: `Agent ${thread.id.slice("thread-".length)}`,
        status: thread.status.type === "idle" ? "idle" : "unknown",
        startedAt: receivedAt,
      }),
    );
    const result = buildAgentHierarchy(input);

    expect(result.agents[0]?.children[0]?.children[0]?.id).toBe("thread-0003");
    expect(result.unresolved).toEqual([]);
  });

  it("orders siblings by start time then locale-independent ID", () => {
    const result = buildAgentHierarchy([
      agent("root", null),
      agent("child-c", "root", { startedAt: null }),
      agent("child-b", "root"),
      agent("child-a", "root"),
    ]);
    expect(result.agents[0]?.children.map(({ id }) => id)).toEqual([
      "child-a",
      "child-b",
      "child-c",
    ]);
  });

  it("quarantines every duplicate occurrence and blocks descendants", () => {
    const input = [
      agent("duplicate", null, { name: "First" }),
      agent("child", "duplicate"),
      agent("duplicate", null, { name: "Second" }),
    ];
    const result = buildAgentHierarchy(input);

    expect(result.agents).toEqual([]);
    expect(result.unresolved).toEqual([
      expect.objectContaining({
        reason: "blocked-by-invalid-parent",
        agent: expect.objectContaining({ id: "child" }),
      }),
      expect.objectContaining({
        reason: "duplicate-id",
        agent: expect.objectContaining({ id: "duplicate", name: "First" }),
      }),
      expect.objectContaining({
        reason: "duplicate-id",
        agent: expect.objectContaining({ id: "duplicate", name: "Second" }),
      }),
    ]);
    expect(result.diagnostics).toEqual([
      { code: "duplicate-id", agentId: "duplicate" },
    ]);
    expectPermutationInvariant(input);
  });

  it("marks a missing parent and its descendant explicitly", () => {
    const input = [agent("orphan", "missing"), agent("child", "orphan")];
    const result = buildAgentHierarchy(input);

    expect(
      result.unresolved.map(({ agent: { id }, reason }) => [id, reason]),
    ).toEqual([
      ["child", "blocked-by-invalid-parent"],
      ["orphan", "missing-parent"],
    ]);
    expectPermutationInvariant(input);
  });

  it("quarantines cycles, self-cycles, and their descendants", () => {
    const cycle = [
      agent("cycle-a", "cycle-b"),
      agent("cycle-b", "cycle-a"),
      agent("below", "cycle-a"),
      agent("self", "self"),
    ];
    const result = buildAgentHierarchy(cycle);

    expect(
      result.unresolved.map(({ agent: { id }, reason }) => [id, reason]),
    ).toEqual([
      ["below", "blocked-by-invalid-parent"],
      ["cycle-a", "cycle"],
      ["cycle-b", "cycle"],
      ["self", "cycle"],
    ]);
    expect(result.diagnostics).toEqual([
      { code: "cycle", agentIds: ["cycle-a", "cycle-b"] },
      { code: "cycle", agentIds: ["self"] },
    ]);
    expectPermutationInvariant(cycle);
  });

  it("diagnoses invalid non-null times and sorts them as unknown", () => {
    const sensitiveMalformedTime = "/Users/private/workspace/secret";
    const input = [
      agent("root", null),
      agent("unknown-time", "root", { startedAt: sensitiveMalformedTime }),
      agent("timezone-less", "root", { startedAt: "2026-01-01T00:00:00.000" }),
      agent("known-time", "root"),
      agent("null-time", "root", { startedAt: null }),
    ];
    const result = buildAgentHierarchy(input);

    expect(result.agents[0]?.children.map(({ id }) => id)).toEqual([
      "known-time",
      "null-time",
      "timezone-less",
      "unknown-time",
    ]);
    expect(result.diagnostics).toContainEqual({
      code: "invalid-start-time",
      agentId: "unknown-time",
    });
    expect(result.diagnostics).toContainEqual({
      code: "invalid-start-time",
      agentId: "timezone-less",
    });
    expect(JSON.stringify(result.diagnostics)).not.toContain(
      sensitiveMalformedTime,
    );
    expectPermutationInvariant(input);
  });

  it("clones usage instead of sharing mutable input state", () => {
    const usage = {
      input: 10,
      cachedInput: 2,
      output: 3,
      total: 13,
      provenance: "reported" as const,
    };
    const result = buildAgentHierarchy([agent("root", null, { usage })]);

    expect(result.agents[0]?.usage).toEqual(usage);
    expect(result.agents[0]?.usage).not.toBe(usage);
  });

  it("builds a valid chain ten thousand levels deep without recursion", () => {
    const depth = 10_000;
    const input = Array.from({ length: depth }, (_, index) =>
      agent(
        `agent-${index.toString().padStart(5, "0")}`,
        index === 0 ? null : `agent-${(index - 1).toString().padStart(5, "0")}`,
      ),
    );

    const result = buildAgentHierarchy(input);
    let current = result.agents[0];
    let visited = 0;
    while (current !== undefined) {
      visited += 1;
      current = current.children[0];
    }

    expect(visited).toBe(depth);
    expect(result.unresolved).toEqual([]);
  });

  it("preserves unknown status, missing usage, and resumed ordering", () => {
    const resumed = [
      agent("child-b", "root", { startedAt: null }),
      agent("root", null, { status: "unknown", usage: null }),
      agent("child-a", "root", { startedAt: null }),
    ];
    const result = buildAgentHierarchy(resumed);

    expect(result.agents[0]).toMatchObject({ status: "unknown", usage: null });
    expect(result.agents[0]?.children.map(({ id }) => id)).toEqual([
      "child-a",
      "child-b",
    ]);
    expectPermutationInvariant(resumed);
  });

  it("replaces membership and status from a resumed full snapshot", () => {
    const initial = buildAgentHierarchy([
      agent("root", null, { status: "idle" }),
      agent("old-child", "root", { status: "completed" }),
    ]);
    const resumed = buildAgentHierarchy([
      agent("root", null, { status: "thinking", usage: null }),
      agent("new-child", "root", { status: "running-command", usage: null }),
    ]);

    expect(initial.agents[0]?.children.map(({ id }) => id)).toEqual([
      "old-child",
    ]);
    expect(resumed.agents[0]).toMatchObject({
      id: "root",
      status: "thinking",
      usage: null,
    });
    expect(resumed.agents[0]?.children).toEqual([
      expect.objectContaining({
        id: "new-child",
        status: "running-command",
        usage: null,
      }),
    ]);
    expect(
      resumed.agents.flatMap(({ children }) => children).map(({ id }) => id),
    ).not.toContain("old-child");
  });
});
