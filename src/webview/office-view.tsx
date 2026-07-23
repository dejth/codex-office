import React, { memo, useEffect, useMemo, useRef, useState } from "react";

import type { WebviewAgent } from "../protocol/webview";
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
}: OfficeViewProps): React.JSX.Element {
  const positioned = useMemo(() => flattenOfficeAgents(agents), [agents]);

  return (
    <section className="office-view" aria-labelledby="office-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Live office preview</p>
          <h1 id="office-heading">Agent floor</h1>
        </div>
        <span className="preview-badge">Synthetic data</span>
      </div>
      <p className="view-summary">
        Each agent moves to a deterministic station for its current status.
      </p>
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
    </section>
  );
});

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
        <span className="desk-prop">
          <span className="prop-screen" />
          <span className="prop-surface" />
        </span>
        <span className="agent-figure">
          <span className="agent-thought">•••</span>
          <span className="agent-head" />
          <span className="agent-body" />
        </span>
        <span className="station-spark">✦</span>
      </span>
      <span className="station-caption">
        <strong>{agent.name}</strong>
        <span>{statusLabel}</span>
      </span>
    </button>
  );
});
