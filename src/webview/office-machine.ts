import type { AgentStatus } from "../domain/model";

export type OfficeStation =
  | "focus-pod"
  | "reading-nook"
  | "writing-desk"
  | "terminal-bay"
  | "approval-desk"
  | "celebration-corner"
  | "recovery-bay"
  | "break-area"
  | "observation-point";

export type OfficePose =
  | "considering"
  | "reading"
  | "typing"
  | "operating-terminal"
  | "requesting-approval"
  | "calm-success"
  | "warning"
  | "resting"
  | "questioning";

export type OfficeAccent =
  | "active"
  | "information"
  | "work"
  | "command"
  | "attention"
  | "success"
  | "danger"
  | "muted"
  | "neutral";

export type OfficeMotion =
  | "thought-breathe"
  | "page-turn"
  | "typing-loop"
  | "terminal-scan"
  | "attention-breathe"
  | "success-settle"
  | "rest-breathe"
  | "none";

export interface OfficeAnimationState {
  station: OfficeStation;
  pose: OfficePose;
  accent: OfficeAccent;
  motion: OfficeMotion;
  phase: "looping" | "settled" | "static";
  reducedMotion: boolean;
}

export interface OfficeAnimationTransition {
  state: OfficeAnimationState;
  changed: boolean;
  transition: "crossfade" | "none";
}

export function nextOfficeTransitionRevision(
  current: number,
  transition: OfficeAnimationTransition["transition"],
): number {
  return transition === "crossfade" ? current + 1 : current;
}

type MotionProfile = Omit<OfficeAnimationState, "phase" | "reducedMotion"> & {
  phase: Exclude<OfficeAnimationState["phase"], "static">;
};

const STATUS_PROFILES = {
  thinking: {
    station: "focus-pod",
    pose: "considering",
    accent: "active",
    motion: "thought-breathe",
    phase: "looping",
  },
  reading: {
    station: "reading-nook",
    pose: "reading",
    accent: "information",
    motion: "page-turn",
    phase: "looping",
  },
  editing: {
    station: "writing-desk",
    pose: "typing",
    accent: "work",
    motion: "typing-loop",
    phase: "looping",
  },
  "running-command": {
    station: "terminal-bay",
    pose: "operating-terminal",
    accent: "command",
    motion: "terminal-scan",
    phase: "looping",
  },
  "waiting-approval": {
    station: "approval-desk",
    pose: "requesting-approval",
    accent: "attention",
    motion: "attention-breathe",
    phase: "looping",
  },
  completed: {
    station: "celebration-corner",
    pose: "calm-success",
    accent: "success",
    motion: "success-settle",
    phase: "settled",
  },
  failed: {
    station: "recovery-bay",
    pose: "warning",
    accent: "danger",
    motion: "none",
    phase: "settled",
  },
  idle: {
    station: "break-area",
    pose: "resting",
    accent: "muted",
    motion: "rest-breathe",
    phase: "looping",
  },
  unknown: {
    station: "observation-point",
    pose: "questioning",
    accent: "neutral",
    motion: "none",
    phase: "settled",
  },
} as const satisfies Record<AgentStatus, MotionProfile>;

/**
 * Projects one status into presentation-only state. Identity, session content,
 * provider data, and filesystem details never enter the animation machine.
 */
export function createOfficeAnimationState(
  status: AgentStatus,
  reducedMotion: boolean,
): OfficeAnimationState {
  const profile = STATUS_PROFILES[status];
  return reducedMotion
    ? {
        station: profile.station,
        pose: profile.pose,
        accent: profile.accent,
        motion: "none",
        phase: "static",
        reducedMotion: true,
      }
    : { ...profile, reducedMotion: false };
}

/**
 * Moves to the deterministic target for the latest status.
 *
 * Repeated snapshots return the current state and do not restart animation.
 * Status or motion-preference changes crossfade only when motion remains
 * enabled. Reduced motion always cuts directly to a static pose.
 */
export function transitionOfficeAnimation(
  current: OfficeAnimationState,
  nextStatus: AgentStatus,
  reducedMotion: boolean,
): OfficeAnimationTransition {
  const next = createOfficeAnimationState(nextStatus, reducedMotion);
  if (animationStatesEqual(current, next)) {
    return { state: current, changed: false, transition: "none" };
  }
  return {
    state: next,
    changed: true,
    transition: reducedMotion ? "none" : "crossfade",
  };
}

function animationStatesEqual(
  left: OfficeAnimationState,
  right: OfficeAnimationState,
): boolean {
  return (
    left.station === right.station &&
    left.pose === right.pose &&
    left.accent === right.accent &&
    left.motion === right.motion &&
    left.phase === right.phase &&
    left.reducedMotion === right.reducedMotion
  );
}
