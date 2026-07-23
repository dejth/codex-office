# Task: Add five-frame blink animation and mascot icon

Status: Complete
Owner: Coordinator (Dex)
Governing contract: CDD-006
Depends on: Issue #36

## Context

The first production animation used two frames and the Activity Bar retained a
generic office outline. The mascot needs smoother action progression, a visible
blink, and a recognizable navigation icon.

## Owned files

- `assets/activity-bar.svg`
- `assets/office/animation/`
- `assets/office/source/five-frame-*.png`
- `assets/office/manifest.json`
- `assets/ATTRIBUTION.md`
- `src/webview/styles.css`
- visual tests, contracts, design docs, and changelog

## Explicit non-goals

- Provider/domain changes.
- Remote assets, GIF, video, canvas, or runtime network requests.
- Animation while reduced motion is enabled.

## Acceptance criteria

- [x] Every status has five baseline-aligned action frames.
- [x] Frame three visibly closes both eyes.
- [x] Reduced motion pins frame one.
- [x] Activity Bar uses a currentColor mascot-head icon.
- [x] Visual, package, accessibility, and full checks pass.
- [x] Independent review passes.

## Verification

- [x] Targeted tests
- [x] `pnpm check`
- [x] Privacy/security impact recorded
- [x] Handoff complete

## Handoff

- Task / owner: Issue #36 / Coordinator (Dex)
- Outcome: All nine statuses use five-frame action sequences with a dedicated
  blink, and the Activity Bar uses the mascot head.
- Files changed: Five-frame sprites and sources, icon, manifest, CSS, tests,
  attribution, contracts, design docs, changelog, and this task.
- Contract decisions: Frame three is the blink; reduced motion pins frame one;
  the navigation icon is a monochrome `currentColor` 24 × 24 SVG.
- Verification performed and result: Visual QA passed all 45 frames; focused
  tests passed 6 files / 43 tests; `pnpm check` passed 24 files / 194 tests; a
  fresh VSIX passed at 23 files / 263,582 bytes; independent review approved.
- Privacy/security impact: All animation remains local and content-free. No
  telemetry, provider data, path exposure, persistence, or network request was
  added.
- Known limitations: Five-frame pixel loops are deliberately compact to remain
  below release budgets.
- Follow-ups / dependencies: New statuses must add five frames with frame three
  reserved for the blink.
- Exact reviewer reproduction steps: Run `pnpm dev`, press F5, inspect each
  status through fixture/runtime snapshots, confirm the third frame blinks,
  then enable reduced motion and verify the open-eye first frame remains still.
