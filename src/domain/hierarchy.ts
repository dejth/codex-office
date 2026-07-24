import type { AgentNode, AgentStatus, TokenUsage } from "./model";

export interface HierarchyAgent {
  id: string;
  parentId: string | null;
  name: string;
  displayName?: string;
  task: string | null;
  status: AgentStatus;
  usage: TokenUsage | null;
  startedAt: string | null;
}

export type UnresolvedReason =
  "duplicate-id" | "missing-parent" | "cycle" | "blocked-by-invalid-parent";

export interface UnresolvedAgent {
  agent: AgentNode;
  reason: UnresolvedReason;
}

export type HierarchyDiagnostic =
  | { code: "duplicate-id"; agentId: string }
  | { code: "missing-parent"; agentId: string; parentId: string }
  | { code: "cycle"; agentIds: string[] }
  | { code: "invalid-start-time"; agentId: string };

export interface HierarchyResult {
  agents: AgentNode[];
  unresolved: UnresolvedAgent[];
  diagnostics: HierarchyDiagnostic[];
}

interface Entry {
  agent: HierarchyAgent;
  startTime: number;
}

/** Builds a deterministic forest and quarantines relationships it cannot prove. */
export function buildAgentHierarchy(
  input: readonly HierarchyAgent[],
): HierarchyResult {
  const entries = input.map(toEntry);
  const diagnostics: HierarchyDiagnostic[] = entries
    .filter(({ agent, startTime }) =>
      agent.startedAt === null ? false : !Number.isFinite(startTime),
    )
    .map(({ agent }) => ({
      code: "invalid-start-time" as const,
      agentId: agent.id,
    }));
  const entriesById = new Map<string, Entry[]>();

  for (const entry of entries) {
    const matches = entriesById.get(entry.agent.id) ?? [];
    matches.push(entry);
    entriesById.set(entry.agent.id, matches);
  }

  const duplicateIds = new Set<string>();
  const byId = new Map<string, Entry>();
  for (const [id, matches] of entriesById) {
    if (matches.length > 1) {
      duplicateIds.add(id);
      diagnostics.push({ code: "duplicate-id", agentId: id });
    } else {
      byId.set(id, matches[0]!);
    }
  }

  const cycleComponents = findCycleComponents(byId);
  const cycleIds = new Set(cycleComponents.flat());
  for (const agentIds of cycleComponents) {
    diagnostics.push({ code: "cycle", agentIds });
  }

  const reasons = new Map<string, UnresolvedReason>();
  for (const id of cycleIds) {
    reasons.set(id, "cycle");
  }
  for (const { agent } of byId.values()) {
    if (agent.parentId === null || reasons.has(agent.id)) continue;
    if (duplicateIds.has(agent.parentId)) {
      reasons.set(agent.id, "blocked-by-invalid-parent");
    } else if (!byId.has(agent.parentId)) {
      reasons.set(agent.id, "missing-parent");
      diagnostics.push({
        code: "missing-parent",
        agentId: agent.id,
        parentId: agent.parentId,
      });
    }
  }

  const childrenByParent = new Map<string, string[]>();
  for (const { agent } of byId.values()) {
    if (agent.parentId === null) continue;
    const childIds = childrenByParent.get(agent.parentId) ?? [];
    childIds.push(agent.id);
    childrenByParent.set(agent.parentId, childIds);
  }
  const invalidQueue = [...reasons.keys()];
  for (let index = 0; index < invalidQueue.length; index += 1) {
    for (const childId of childrenByParent.get(invalidQueue[index]!) ?? []) {
      if (reasons.has(childId)) continue;
      reasons.set(childId, "blocked-by-invalid-parent");
      invalidQueue.push(childId);
    }
  }

  const unresolved: UnresolvedAgent[] = [];

  for (const matches of entriesById.values()) {
    if (matches.length > 1) {
      unresolved.push(
        ...matches.map((entry) => ({
          agent: toNode(entry.agent),
          reason: "duplicate-id" as const,
        })),
      );
    }
  }

  const validEntries: Entry[] = [];
  for (const entry of byId.values()) {
    const reason = reasons.get(entry.agent.id);
    if (reason !== undefined) {
      unresolved.push({ agent: toNode(entry.agent), reason });
    } else {
      validEntries.push(entry);
    }
  }

  validEntries.sort(compareEntries);
  const nodesById = new Map(
    validEntries.map((entry) => [entry.agent.id, toNode(entry.agent)]),
  );
  const roots: AgentNode[] = [];
  for (const { agent } of validEntries) {
    const node = nodesById.get(agent.id)!;
    if (agent.parentId === null) {
      roots.push(node);
    } else {
      nodesById.get(agent.parentId)!.children.push(node);
    }
  }

  return {
    agents: roots,
    unresolved: unresolved.sort(compareUnresolved),
    diagnostics: diagnostics.sort(compareDiagnostics),
  };
}

function toEntry(agent: HierarchyAgent): Entry {
  const parsed = parseCanonicalUtc(agent.startedAt);
  return {
    agent,
    startTime: parsed ?? Number.POSITIVE_INFINITY,
  };
}

function parseCanonicalUtc(value: string | null): number | null {
  if (
    value === null ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
  ) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) || new Date(parsed).toISOString() !== value
    ? null
    : parsed;
}

function toNode(agent: HierarchyAgent): AgentNode {
  return {
    id: agent.id,
    parentId: agent.parentId,
    name: agent.name,
    ...(agent.displayName === undefined
      ? {}
      : { displayName: agent.displayName }),
    task: agent.task,
    status: agent.status,
    usage: agent.usage === null ? null : { ...agent.usage },
    children: [],
  };
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareEntries(left: Entry, right: Entry): number {
  if (left.startTime !== right.startTime)
    return left.startTime - right.startTime;
  return compareText(left.agent.id, right.agent.id);
}

function compareUnresolved(
  left: UnresolvedAgent,
  right: UnresolvedAgent,
): number {
  return (
    compareText(left.agent.id, right.agent.id) ||
    compareText(left.reason, right.reason) ||
    compareText(JSON.stringify(left.agent), JSON.stringify(right.agent))
  );
}

function compareDiagnostics(
  left: HierarchyDiagnostic,
  right: HierarchyDiagnostic,
): number {
  return compareText(JSON.stringify(left), JSON.stringify(right));
}

function findCycleComponents(byId: ReadonlyMap<string, Entry>): string[][] {
  const state = new Map<string, "visiting" | "done">();
  const components: string[][] = [];
  for (const id of [...byId.keys()].sort(compareText)) {
    if (state.has(id)) continue;
    const path: string[] = [];
    const pathIndex = new Map<string, number>();
    let current: string | null = id;

    while (current !== null && byId.has(current) && !state.has(current)) {
      state.set(current, "visiting");
      pathIndex.set(current, path.length);
      path.push(current);
      current = byId.get(current)?.agent.parentId ?? null;
    }

    if (current !== null && state.get(current) === "visiting") {
      const cycleStart = pathIndex.get(current);
      if (cycleStart !== undefined) {
        components.push(path.slice(cycleStart).sort(compareText));
      }
    }
    for (const pathId of path) state.set(pathId, "done");
  }
  return components.sort((left, right) => compareText(left[0]!, right[0]!));
}
