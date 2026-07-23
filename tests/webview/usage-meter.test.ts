import { describe, expect, it } from "vitest";

import type { UsageProvenance } from "../../src/domain/model";
import type { WebviewAgent } from "../../src/protocol/webview";
import {
  createUsageMeterModel,
  USAGE_METER_OVERLAP_CAVEAT,
  USAGE_METER_SCOPE,
} from "../../src/webview/usage-meter";

function agent(
  id: string,
  values: {
    input: number | null;
    cachedInput: number | null;
    output: number | null;
    total: number | null;
    provenance: UsageProvenance;
  } | null,
  children: WebviewAgent[] = [],
): WebviewAgent {
  return {
    id,
    name: `Agent ${id}`,
    status: "thinking",
    usage: values,
    children,
  };
}

const usage = (total: number, provenance: UsageProvenance = "reported") => ({
  input: total - 3,
  cachedInput: 1,
  output: 2,
  total,
  provenance,
});

describe("usage meter model", () => {
  it("flattens nested agents in deterministic pre-order", () => {
    const model = createUsageMeterModel([
      agent("root-a", usage(10), [
        agent("child-a", usage(20), [agent("grandchild", usage(30))]),
      ]),
      agent("root-b", usage(40)),
    ]);

    expect(model.rows.map(({ id, depth }) => [id, depth])).toEqual([
      ["root-a", 0],
      ["child-a", 1],
      ["grandchild", 2],
      ["root-b", 0],
    ]);
    expect(model.summary).toMatchObject({
      mainAgents: 2,
      subagents: 2,
      visibleThreads: 4,
      scope: USAGE_METER_SCOPE,
      caveat: USAGE_METER_OVERLAP_CAVEAT,
    });
  });

  it("preserves each agent's components, nulls, and provenance", () => {
    const model = createUsageMeterModel([
      agent("reported", {
        input: 8,
        cachedInput: null,
        output: 2,
        total: 10,
        provenance: "reported",
      }),
      agent("missing", null),
    ]);

    expect(model.rows[0]!.usage).toEqual({
      input: 8,
      cachedInput: null,
      output: 2,
      total: 10,
      provenance: "reported",
    });
    expect(model.rows[1]!.usage).toBeNull();
    expect(model.summary.usage.cachedInput).toEqual({
      value: null,
      provenance: null,
      contributingThreads: 0,
      overflow: false,
      unavailableReason: "no-values",
    });
  });

  it("keeps a single visible value's reported, derived, or estimated label", () => {
    for (const provenance of ["reported", "derived", "estimated"] as const) {
      const model = createUsageMeterModel([
        agent(provenance, usage(10, provenance)),
      ]);

      expect(model.summary.usage.total).toMatchObject({
        value: 10,
        provenance,
        contributingThreads: 1,
        unavailableReason: null,
      });
    }
  });

  it("does not combine values across visible thread snapshots", () => {
    const model = createUsageMeterModel([
      agent("a", usage(10, "reported")),
      agent("b", usage(20, "derived")),
    ]);

    expect(model.summary.usage.total).toEqual({
      value: null,
      provenance: null,
      contributingThreads: 2,
      overflow: false,
      unavailableReason: "multiple-thread-snapshots",
    });
  });

  it("preserves estimated provenance for one visible thread", () => {
    const model = createUsageMeterModel([agent("a", usage(20, "estimated"))]);

    expect(model.summary.usage.total.provenance).toBe("estimated");
  });

  it("counts duplicate-looking usage as distinct visible threads", () => {
    const model = createUsageMeterModel([
      agent("parent", usage(100), [agent("child", usage(100))]),
    ]);

    expect(model.summary.usage.total).toEqual({
      value: null,
      provenance: null,
      contributingThreads: 2,
      overflow: false,
      unavailableReason: "multiple-thread-snapshots",
    });
    expect(model.summary.caveat).toBe("possible-parent-child-context-overlap");
  });

  it("does not infer replay deduplication from decreasing or equal values", () => {
    const model = createUsageMeterModel([
      agent("first", usage(90)),
      agent("replay", usage(90)),
      agent("later", usage(80)),
    ]);

    expect(model.summary.usage.total.value).toBeNull();
    expect(model.summary.usage.total.contributingThreads).toBe(3);
    expect(model.summary.usage.total.unavailableReason).toBe(
      "multiple-thread-snapshots",
    );
  });

  it("accepts an exact MAX_SAFE_INTEGER value", () => {
    const model = createUsageMeterModel([
      agent("maximum", {
        input: Number.MAX_SAFE_INTEGER,
        cachedInput: null,
        output: 0,
        total: Number.MAX_SAFE_INTEGER,
        provenance: "reported",
      }),
    ]);

    expect(model.summary.usage.input).toMatchObject({
      value: Number.MAX_SAFE_INTEGER,
      provenance: "reported",
      overflow: false,
      unavailableReason: null,
    });
    expect(model.summary.usage.output.value).toBe(0);
  });

  it("fails unsafe values closed without cross-thread arithmetic", () => {
    const model = createUsageMeterModel([
      agent("unsafe", {
        input: Number.MAX_SAFE_INTEGER + 1,
        cachedInput: 2,
        output: 3,
        total: Number.MAX_SAFE_INTEGER + 1,
        provenance: "reported",
      }),
    ]);

    expect(model.summary.usage.input).toEqual({
      value: null,
      provenance: null,
      contributingThreads: 1,
      overflow: true,
      unavailableReason: "unsafe-value",
    });
    expect(model.summary.usage.total.overflow).toBe(true);
    expect(model.summary.usage.cachedInput.value).toBe(2);
    expect(model.summary.usage.output.value).toBe(3);
  });

  it("returns unknown aggregates rather than zero for an empty tree", () => {
    const model = createUsageMeterModel([]);

    expect(model.rows).toEqual([]);
    expect(model.summary.visibleThreads).toBe(0);
    expect(model.summary.usage.total).toEqual({
      value: null,
      provenance: null,
      contributingThreads: 0,
      overflow: false,
      unavailableReason: "no-values",
    });
  });
});
