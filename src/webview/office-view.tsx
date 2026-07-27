import React, { memo, useEffect, useMemo, useRef, useState } from "react";

import type { WebviewAgent, WebviewSnapshot } from "../protocol/webview";
import {
  createOfficeAnimationState,
  nextOfficeTransitionRevision,
  transitionOfficeAnimation,
  type OfficeAnimationState,
  type OfficeStation,
} from "./office-machine";

const STATION_LABELS: Record<OfficeStation, string> = {
  "focus-pod": "Focus pod",
  "reading-nook": "Reading nook",
  "writing-desk": "Writing desk",
  "terminal-bay": "Terminal bay",
  "approval-desk": "Approval desk",
  "celebration-corner": "Celebration corner",
  "recovery-bay": "Recovery bay",
  "break-area": "Break area",
  "observation-point": "Observation point",
};

const STATUS_LABELS: Record<WebviewAgent["status"], string> = {
  thinking: "Thinking",
  reading: "Reading",
  editing: "Editing",
  "running-command": "Running command",
  "waiting-approval": "Waiting for approval",
  completed: "Completed",
  failed: "Failed",
  idle: "Idle",
  unknown: "Unreported",
};

interface OfficeViewProps {
  agents: readonly WebviewAgent[];
  reducedMotion: boolean;
  selectedId: string | null;
  onSelect(id: string): void;
  connection: WebviewSnapshot["connection"];
  statusSource?: WebviewSnapshot["statusSource"];
}

interface PositionedAgent {
  agent: WebviewAgent;
  level: number;
}

interface ActivityRank {
  priority: number;
  timestamp: number;
}

type OfficeFilter =
  "all" | "working" | "waiting" | "failed" | "idle" | "unreported";

const UNREPORTED_COLLAPSE_THRESHOLD = 6;

const FILTERS: ReadonlyArray<{ id: OfficeFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "working", label: "Working" },
  { id: "waiting", label: "Waiting" },
  { id: "failed", label: "Failed" },
  { id: "idle", label: "Idle" },
  { id: "unreported", label: "Unreported" },
];

function matchesOfficeFilter(
  status: WebviewAgent["status"],
  filter: OfficeFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "unreported") return status === "unknown";
  if (filter === "waiting") return status === "waiting-approval";
  if (filter === "failed") return status === "failed";
  if (filter === "idle") return status === "idle";
  return (
    status === "thinking" ||
    status === "reading" ||
    status === "editing" ||
    status === "running-command"
  );
}

function subtreeHasReportedStatus(agent: WebviewAgent): boolean {
  return (
    agent.status !== "unknown" ||
    agent.children.some((child) => subtreeHasReportedStatus(child))
  );
}

function subtreeMatchesFilter(
  agent: WebviewAgent,
  filter: OfficeFilter,
): boolean {
  return (
    matchesOfficeFilter(agent.status, filter) ||
    agent.children.some((child) => subtreeMatchesFilter(child, filter))
  );
}

/** Keeps complete root groups only when the root or a descendant matches. */
export function filterOfficeAgentGroups(
  agents: readonly WebviewAgent[],
  filter: OfficeFilter,
): WebviewAgent[] {
  if (filter === "all") return [...agents];
  return agents.filter((agent) => subtreeMatchesFilter(agent, filter));
}

export function nextOfficeFocusId(
  ids: readonly string[],
  currentId: string,
  key: string,
): string {
  const index = ids.indexOf(currentId);
  if (index < 0 || ids.length === 0) return currentId;
  if (key === "Home") return ids[0]!;
  if (key === "End") return ids[ids.length - 1]!;
  if (key === "ArrowRight" || key === "ArrowDown")
    return ids[Math.min(index + 1, ids.length - 1)]!;
  if (key === "ArrowLeft" || key === "ArrowUp")
    return ids[Math.max(index - 1, 0)]!;
  return currentId;
}

const ACTIVE_STATUSES = new Set<WebviewAgent["status"]>([
  "thinking",
  "reading",
  "editing",
  "running-command",
]);

function statusPriority(status: WebviewAgent["status"]): number {
  if (ACTIVE_STATUSES.has(status)) return 0;
  if (status === "waiting-approval" || status === "failed") return 1;
  if (status === "idle" || status === "completed") return 2;
  return 3;
}

function ownActivityRank(agent: WebviewAgent): ActivityRank {
  const parsed =
    agent.lastActivityAt === null
      ? Number.NEGATIVE_INFINITY
      : Date.parse(agent.lastActivityAt);
  return {
    priority: statusPriority(agent.status),
    timestamp: Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY,
  };
}

function compareActivityRank(left: ActivityRank, right: ActivityRank): number {
  return left.priority - right.priority || right.timestamp - left.timestamp;
}

/** Orders sibling groups by their most relevant reported activity. */
export function orderOfficeAgents(
  agents: readonly WebviewAgent[],
): WebviewAgent[] {
  const ranks = new Map<string, ActivityRank>();
  const rankSubtree = (agent: WebviewAgent): ActivityRank => {
    let rank = ownActivityRank(agent);
    for (const child of agent.children) {
      const childRank = rankSubtree(child);
      if (compareActivityRank(childRank, rank) < 0) rank = childRank;
    }
    ranks.set(agent.id, rank);
    return rank;
  };
  for (const agent of agents) rankSubtree(agent);

  const sortGroup = (group: readonly WebviewAgent[]): WebviewAgent[] =>
    [...group]
      .sort((left, right) => {
        const ranked = compareActivityRank(
          ranks.get(left.id)!,
          ranks.get(right.id)!,
        );
        return ranked || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
      })
      .map((agent) => ({ ...agent, children: sortGroup(agent.children) }));
  return sortGroup(agents);
}

function flattenOfficeAgents(
  agents: readonly WebviewAgent[],
): PositionedAgent[] {
  const result: PositionedAgent[] = [];
  const ordered = orderOfficeAgents(agents);
  const stack = [...ordered].reverse().map((agent) => ({ agent, level: 1 }));
  while (stack.length > 0) {
    const current = stack.pop()!;
    result.push(current);
    for (
      let index = current.agent.children.length - 1;
      index >= 0;
      index -= 1
    ) {
      stack.push({
        agent: current.agent.children[index]!,
        level: current.level + 1,
      });
    }
  }
  return result;
}

export const OfficeView = memo(function OfficeView({
  agents,
  reducedMotion,
  selectedId,
  onSelect,
  connection,
  statusSource = null,
}: OfficeViewProps): React.JSX.Element {
  const positioned = useMemo(() => flattenOfficeAgents(agents), [agents]);
  const [filter, setFilter] = useState<OfficeFilter>("all");
  const [showOtherSessions, setShowOtherSessions] = useState(false);
  const { reportedGroups, unreportedOnlyGroups, unreportedOnlyCount } =
    useMemo(() => {
      const reportedGroups: WebviewAgent[] = [];
      const unreportedOnlyGroups: WebviewAgent[] = [];
      let unreportedOnlyCount = 0;
      for (const agent of agents) {
        if (subtreeHasReportedStatus(agent)) reportedGroups.push(agent);
        else {
          unreportedOnlyGroups.push(agent);
          unreportedOnlyCount += flattenOfficeAgents([agent]).length;
        }
      }
      return { reportedGroups, unreportedOnlyGroups, unreportedOnlyCount };
    }, [agents]);
  const collapseOtherSessions =
    unreportedOnlyCount >= UNREPORTED_COLLAPSE_THRESHOLD;
  const visible = useMemo(() => {
    if (filter !== "all")
      return flattenOfficeAgents(filterOfficeAgentGroups(agents, filter));
    const groups =
      collapseOtherSessions && !showOtherSessions
        ? reportedGroups
        : [...reportedGroups, ...unreportedOnlyGroups];
    return flattenOfficeAgents(groups);
  }, [
    agents,
    collapseOtherSessions,
    filter,
    reportedGroups,
    showOtherSessions,
    unreportedOnlyGroups,
  ]);
  const visibleIds = useMemo(
    () => visible.map(({ agent }) => agent.id),
    [visible],
  );
  const [focusedId, setFocusedId] = useState<string | null>(selectedId);
  const activeId = visibleIds.includes(focusedId ?? "")
    ? focusedId
    : visibleIds.includes(selectedId ?? "")
      ? selectedId
      : (visibleIds[0] ?? null);
  const isEmpty = positioned.length === 0;
  const isFilterEmpty = filter !== "all" && !isEmpty && visible.length === 0;
  const subagentCount = Math.max(positioned.length - agents.length, 0);
  const unreportedCount = positioned.filter(
    ({ agent }) => agent.status === "unknown",
  ).length;

  useEffect(() => {
    setFocusedId((current) =>
      visibleIds.includes(current ?? "")
        ? current
        : visibleIds.includes(selectedId ?? "")
          ? selectedId
          : (visibleIds[0] ?? null),
    );
  }, [selectedId, visibleIds]);

  const moveFocus = (currentId: string, key: string): void => {
    const nextId = nextOfficeFocusId(visibleIds, currentId, key);
    setFocusedId(nextId);
    document.getElementById(`office-agent-${nextId}`)?.focus();
  };

  return (
    <section className="office-view" aria-labelledby="office-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Codex workspace</p>
          <h1 id="office-heading">Agent floor</h1>
        </div>
        <div className="office-badges">
          {isEmpty ? null : (
            <span className="preview-badge">
              {agents.length} Roots · {subagentCount} Subs
            </span>
          )}
          <span className="preview-badge">
            {statusSource === "shared-observer"
              ? "Shared observer"
              : statusSource === "persisted-inventory"
                ? "Persisted inventory"
                : "Source unavailable"}
          </span>
        </div>
      </div>
      <p className="view-summary">
        Live status reported by the local Codex provider.
      </p>
      {isEmpty ? null : (
        <div className="office-filters" aria-label="Filter agents">
          {FILTERS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={filter === id}
              onClick={() => setFilter(id)}
            >
              {label}
              {id === "unreported" ? ` ${unreportedCount}` : ""}
            </button>
          ))}
        </div>
      )}
      {isEmpty ? (
        <OfficeEmptyState
          connection={connection}
          reducedMotion={reducedMotion}
        />
      ) : isFilterEmpty ? (
        <div className="office-filter-empty" role="status">
          <h2>
            No {FILTERS.find(({ id }) => id === filter)?.label.toLowerCase()}{" "}
            agents
          </h2>
          <p>Try another status filter to see this workspace’s sessions.</p>
        </div>
      ) : (
        <div
          className="office-room"
          data-reduced-motion={reducedMotion ? "true" : "false"}
          aria-label="Visual agent office"
        >
          <div className="office-wall" aria-hidden="true">
            <span className="office-mark" />
            <span>
              {visible.length} shown · {positioned.length} sessions
            </span>
          </div>
          <div className="office-floor">
            {visible.map(({ agent, level }) => (
              <OfficeAgent
                key={agent.id}
                agent={agent}
                level={level}
                reducedMotion={reducedMotion}
                selected={selectedId === agent.id}
                tabIndex={activeId === agent.id ? 0 : -1}
                onFocus={setFocusedId}
                onMoveFocus={moveFocus}
                onSelect={onSelect}
                showStatus={
                  agent.status !== "unknown" || filter === "unreported"
                }
              />
            ))}
          </div>
          {filter === "all" && collapseOtherSessions ? (
            <button
              className="other-sessions-toggle"
              type="button"
              aria-expanded={showOtherSessions}
              onClick={() => setShowOtherSessions((current) => !current)}
            >
              <span>Other sessions</span>
              <span>
                {unreportedOnlyCount} Unreported ·{" "}
                {showOtherSessions ? "Hide" : "Show"}
              </span>
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
});

const EMPTY_STATE_COPY: Record<
  WebviewSnapshot["connection"],
  { title: string; detail: string; character: WebviewAgent["status"] }
> = {
  connected: {
    title: "No Codex sessions found",
    detail: "Start a Codex session in this workspace, then refresh the view.",
    character: "idle",
  },
  degraded: {
    title: "Codex provider unavailable",
    detail: "The Office will update after the local provider recovers.",
    character: "failed",
  },
  disconnected: {
    title: "Waiting for Codex provider",
    detail: "The Office will appear after a local provider connects.",
    character: "unknown",
  },
};

function OfficeEmptyState({
  connection,
  reducedMotion,
}: {
  connection: WebviewSnapshot["connection"];
  reducedMotion: boolean;
}): React.JSX.Element {
  const copy = EMPTY_STATE_COPY[connection];
  return (
    <div
      className="office-empty-state"
      data-reduced-motion={reducedMotion ? "true" : "false"}
    >
      <span
        className={`pixel-character pixel-character-${copy.character}`}
        aria-hidden="true"
      />
      <h2>{copy.title}</h2>
      <p>{copy.detail}</p>
    </div>
  );
}

interface OfficeAgentProps {
  agent: WebviewAgent;
  level: number;
  reducedMotion: boolean;
  selected: boolean;
  tabIndex: number;
  onFocus(id: string): void;
  onMoveFocus(id: string, key: string): void;
  onSelect(id: string): void;
  showStatus: boolean;
}

const OfficeAgent = memo(function OfficeAgent({
  agent,
  level,
  reducedMotion,
  selected,
  tabIndex,
  onFocus,
  onMoveFocus,
  onSelect,
  showStatus,
}: OfficeAgentProps): React.JSX.Element {
  const [animation, setAnimation] = useState<OfficeAnimationState>(() =>
    createOfficeAnimationState(agent.status, reducedMotion),
  );
  const animationRef = useRef(animation);
  const [transition, setTransition] = useState<"crossfade" | "none">("none");
  const [transitionRevision, setTransitionRevision] = useState(0);

  useEffect(() => {
    const next = transitionOfficeAnimation(
      animationRef.current,
      agent.status,
      reducedMotion,
    );
    animationRef.current = next.state;
    setAnimation(next.state);
    setTransition(next.transition);
    setTransitionRevision((current) =>
      nextOfficeTransitionRevision(current, next.transition),
    );
  }, [agent.status, reducedMotion]);

  const statusLabel = STATUS_LABELS[agent.status];
  return (
    <button
      className="office-station"
      type="button"
      aria-pressed={selected}
      aria-label={`${agent.name}, ${statusLabel}, ${STATION_LABELS[animation.station]}`}
      id={`office-agent-${agent.id}`}
      tabIndex={tabIndex}
      data-accent={animation.accent}
      data-level={level}
      data-root={level === 1 ? "true" : "false"}
      data-motion={animation.motion}
      data-transition={transition}
      onClick={() => onSelect(agent.id)}
      onFocus={() => onFocus(agent.id)}
      onKeyDown={(event) => {
        if (
          [
            "ArrowDown",
            "ArrowUp",
            "ArrowLeft",
            "ArrowRight",
            "Home",
            "End",
          ].includes(event.key)
        ) {
          event.preventDefault();
          onMoveFocus(agent.id, event.key);
        }
      }}
    >
      <span className="station-sign">{level === 1 ? "Root" : "Sub"}</span>
      <span
        key={transitionRevision}
        className="station-scene"
        aria-hidden="true"
      >
        <span className={`pixel-character pixel-character-${agent.status}`} />
      </span>
      <span className="station-caption">
        <strong>{agent.name}</strong>
        <span className={showStatus ? undefined : "sr-only"}>
          {statusLabel}
        </span>
      </span>
    </button>
  );
});
