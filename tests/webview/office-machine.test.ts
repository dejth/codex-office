import { describe, expect, it } from "vitest";

import type { AgentStatus } from "../../src/domain/model";
import {
  createOfficeAnimationState,
  nextOfficeTransitionRevision,
  transitionOfficeAnimation,
} from "../../src/webview/office-machine";

const expectedByStatus = {
  thinking: [
    "focus-pod",
    "considering",
    "active",
    "thought-breathe",
    "looping",
  ],
  reading: ["reading-nook", "reading", "information", "page-turn", "looping"],
  editing: ["writing-desk", "typing", "work", "typing-loop", "looping"],
  "running-command": [
    "terminal-bay",
    "operating-terminal",
    "command",
    "terminal-scan",
    "looping",
  ],
  "waiting-approval": [
    "approval-desk",
    "requesting-approval",
    "attention",
    "attention-breathe",
    "looping",
  ],
  completed: [
    "celebration-corner",
    "calm-success",
    "success",
    "success-settle",
    "settled",
  ],
  failed: ["recovery-bay", "warning", "danger", "none", "settled"],
  idle: ["break-area", "resting", "muted", "rest-breathe", "looping"],
  unknown: ["observation-point", "questioning", "neutral", "none", "settled"],
} as const satisfies Record<AgentStatus, readonly string[]>;

describe("Office animation state machine", () => {
  it.each(Object.entries(expectedByStatus))(
    "maps %s to its named presentation state",
    (status, expected) => {
      const state = createOfficeAnimationState(status as AgentStatus, false);

      expect([
        state.station,
        state.pose,
        state.accent,
        state.motion,
        state.phase,
      ]).toEqual(expected);
      expect(state.reducedMotion).toBe(false);
    },
  );

  it("returns the same state for the same input", () => {
    const first = createOfficeAnimationState("editing", false);
    const second = createOfficeAnimationState("editing", false);

    expect(second).toEqual(first);
  });

  it("does not restart motion for a repeated status snapshot", () => {
    const current = createOfficeAnimationState("thinking", false);

    expect(transitionOfficeAnimation(current, "thinking", false)).toEqual({
      state: current,
      changed: false,
      transition: "none",
    });
  });

  it("crossfades deterministically when status changes", () => {
    const current = createOfficeAnimationState("reading", false);
    const transition = transitionOfficeAnimation(current, "editing", false);

    expect(transition).toEqual({
      state: createOfficeAnimationState("editing", false),
      changed: true,
      transition: "crossfade",
    });
  });

  it("advances the animation revision for every consecutive crossfade", () => {
    const first = nextOfficeTransitionRevision(0, "crossfade");
    const second = nextOfficeTransitionRevision(first, "crossfade");

    expect(first).toBe(1);
    expect(second).toBe(2);
    expect(nextOfficeTransitionRevision(second, "none")).toBe(2);
  });

  it.each(Object.keys(expectedByStatus) as AgentStatus[])(
    "forces %s into a static pose when reduced motion is enabled",
    (status) => {
      const state = createOfficeAnimationState(status, true);

      expect(state).toMatchObject({
        motion: "none",
        phase: "static",
        reducedMotion: true,
      });
    },
  );

  it("uses no transition animation when reduced motion becomes enabled", () => {
    const current = createOfficeAnimationState("running-command", false);
    const transition = transitionOfficeAnimation(
      current,
      "waiting-approval",
      true,
    );

    expect(transition.changed).toBe(true);
    expect(transition.transition).toBe("none");
    expect(transition.state).toEqual(
      createOfficeAnimationState("waiting-approval", true),
    );
  });

  it("contains presentation fields only", () => {
    const serialized = JSON.stringify(
      transitionOfficeAnimation(
        createOfficeAnimationState("idle", false),
        "completed",
        false,
      ),
    );

    for (const forbidden of [
      "id",
      "name",
      "session",
      "task",
      "path",
      "provider",
      "content",
      "usage",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
    expect(Object.keys(createOfficeAnimationState("completed", false))).toEqual(
      ["station", "pose", "accent", "motion", "phase", "reducedMotion"],
    );
  });
});
