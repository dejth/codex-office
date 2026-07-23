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
  unknown: "Unknown",
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
  const isEmpty = positioned.length === 0;

  return (
    <section className="office-view" aria-labelledby="office-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Codex workspace</p>
          <h1 id="office-heading">Agent floor</h1>
        </div>
        {isEmpty ? null : <span className="preview-badge">Local sessions</span>}
      </div>
      <p className="view-summary">
        Sessions appear at deterministic stations using status reported by the
        local Codex provider.
      </p>
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
            <span className="office-logo">CO</span>
            <span className="office-clock">09:41</span>
          </div>
          <div className="office-floor">
            {positioned.map(({ agent, level }) => (
              <OfficeAgent
                key={agent.id}
                agent={agent}
                level={level}
                reducedMotion={reducedMotion}
                selected={selectedId === agent.id}
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
  onSelect(id: string): void;
}

const OfficeAgent = memo(function OfficeAgent({
  agent,
  level,
  reducedMotion,
  selected,
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
      data-accent={animation.accent}
      data-level={level}
      data-motion={animation.motion}
      data-transition={transition}
      onClick={() => onSelect(agent.id)}
    >
      <span className="station-sign">
        {level === 1 ? "Main" : `L${level}`} ·{" "}
        {STATION_LABELS[animation.station]}
      </span>
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
