import type { AgentStatus, UsageProvenance } from "../domain/model";
import type { WebviewAgent } from "../protocol/webview";

export const USAGE_METER_SCOPE = "visible-thread-snapshots" as const;
export const USAGE_METER_OVERLAP_CAVEAT =
  "possible-parent-child-context-overlap" as const;

type UsageField = "input" | "cachedInput" | "output" | "total";

export interface UsageMeterRow {
  id: string;
  name: string;
  status: AgentStatus;
  depth: number;
  usage: {
    input: number | null;
    cachedInput: number | null;
    output: number | null;
    total: number | null;
    provenance: UsageProvenance;
  } | null;
}

export interface UsageMeterAggregate {
  value: number | null;
  provenance: UsageProvenance | null;
  contributingThreads: number;
  overflow: boolean;
  unavailableReason:
    "no-values" | "multiple-thread-snapshots" | "unsafe-value" | null;
}

export interface UsageMeterSummary {
  mainAgents: number;
  subagents: number;
  visibleThreads: number;
  usage: Record<UsageField, UsageMeterAggregate>;
  scope: typeof USAGE_METER_SCOPE;
  caveat: typeof USAGE_METER_OVERLAP_CAVEAT;
}

export interface UsageMeterModel {
  rows: UsageMeterRow[];
  summary: UsageMeterSummary;
}

const USAGE_FIELDS = [
  "input",
  "cachedInput",
  "output",
  "total",
] as const satisfies readonly UsageField[];

/**
 * Builds the Meter's deterministic, display-only model from the already
 * sanitized webview snapshot. Each visible agent remains a separate thread:
 * equal values and possible replayed parent context are intentionally not
 * deduplicated because the snapshot carries no evidence that would permit it.
 */
export function createUsageMeterModel(
  agents: readonly WebviewAgent[],
): UsageMeterModel {
  const rows: UsageMeterRow[] = [];
  const stack = [...agents].reverse().map((agent) => ({ agent, depth: 0 }));

  while (stack.length > 0) {
    const { agent, depth } = stack.pop()!;
    rows.push({
      id: agent.id,
      name: agent.name,
      status: agent.status,
      depth,
      usage: agent.usage === null ? null : { ...agent.usage },
    });

    for (let index = agent.children.length - 1; index >= 0; index -= 1) {
      stack.push({ agent: agent.children[index]!, depth: depth + 1 });
    }
  }

  const usage = Object.fromEntries(
    USAGE_FIELDS.map((field) => [field, aggregateField(rows, field)]),
  ) as Record<UsageField, UsageMeterAggregate>;

  return {
    rows,
    summary: {
      mainAgents: agents.length,
      subagents: rows.length - agents.length,
      visibleThreads: rows.length,
      usage,
      scope: USAGE_METER_SCOPE,
      caveat: USAGE_METER_OVERLAP_CAVEAT,
    },
  };
}

function aggregateField(
  rows: readonly UsageMeterRow[],
  field: UsageField,
): UsageMeterAggregate {
  let value: number | null = null;
  let contributingThreads = 0;
  let provenance: UsageProvenance | null = null;

  for (const row of rows) {
    const next = row.usage?.[field];
    if (next === null || next === undefined) {
      continue;
    }

    contributingThreads += 1;
    if (!Number.isSafeInteger(next) || next < 0) {
      return {
        value: null,
        provenance: null,
        contributingThreads,
        overflow: true,
        unavailableReason: "unsafe-value",
      };
    }
    if (contributingThreads === 1) {
      value = next;
      provenance = row.usage!.provenance;
    } else {
      value = null;
      provenance = null;
    }
  }

  if (contributingThreads === 0) {
    return {
      value: null,
      provenance: null,
      contributingThreads: 0,
      overflow: false,
      unavailableReason: "no-values",
    };
  }

  return {
    value,
    provenance,
    contributingThreads,
    overflow: false,
    unavailableReason:
      contributingThreads > 1 ? "multiple-thread-snapshots" : null,
  };
}
