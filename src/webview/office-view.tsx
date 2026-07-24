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
}

interface PositionedAgent {
  agent: WebviewAgent;
  level: number;
}

type OfficeFilter = "all" | "active" | "waiting" | "done" | "unreported";

const FILTERS: ReadonlyArray<{ id: OfficeFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "waiting", label: "Waiting" },
  { id: "done", label: "Done" },
  { id: "unreported", label: "Unreported" },
];

function matchesOfficeFilter(
  status: WebviewAgent["status"],
  filter: OfficeFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "unreported") return status === "unknown";
  if (filter === "waiting") return status === "waiting-approval";
  if (filter === "done")
    return status === "completed" || status === "failed" || status === "idle";
  return (
    status === "thinking" ||
    status === "reading" ||
    status === "editing" ||
    status === "running-command"
  );
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

function flattenOfficeAgents(
  agents: readonly WebviewAgent[],
): PositionedAgent[] {
  const result: PositionedAgent[] = [];
  const stack = [...agents].reverse().map((agent) => ({ agent, level: 1 }));
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
}: OfficeViewProps): React.JSX.Element {
  const positioned = useMemo(() => flattenOfficeAgents(agents), [agents]);
  const [filter, setFilter] = useState<OfficeFilter>("all");
  const visible = useMemo(
    () =>
      positioned.filter(
        ({ agent, level }) =>
          level === 1 || matchesOfficeFilter(agent.status, filter),
      ),
    [filter, positioned],
  );
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
        {isEmpty ? null : (
          <span className="preview-badge">
            {agents.length} Roots · {subagentCount} Subs
          </span>
        )}
      </div>
      <p className="view-summary">
        Sessions appear at deterministic stations using status reported by the
        local Codex provider.
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
      ) : (
        <div
          className="office-room"
          data-reduced-motion={reducedMotion ? "true" : "false"}
          aria-label="Visual agent office"
        >
          <div className="office-wall" aria-hidden="true">
            <span className="office-mark" />
            <span>{visible.length} in room</span>
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
              />
            ))}
          </div>
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
      <span className="station-sign">{level === 1 ? "Main" : "Sub"}</span>
      <span
        key={transitionRevision}
        className="station-scene"
        aria-hidden="true"
      >
        <span className={`pixel-character pixel-character-${agent.status}`} />
      </span>
      <span className="station-caption">
        <strong>{agent.name}</strong>
        <span>{statusLabel}</span>
      </span>
    </button>
  );
});
