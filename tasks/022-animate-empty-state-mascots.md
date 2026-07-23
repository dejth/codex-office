# Task: Animate empty-state mascots

Status: Complete
Owner: Coordinator (Dex)
Governing contract: CDD-006
Depends on: Issue #38

## Context

Five-frame animation selectors targeted only populated Office stations.
Empty-state characters rendered outside `.office-room`, so they remained
permanently on frame one.

## Owned files

- `src/webview/office-view.tsx`
- `src/webview/styles.css`
- related webview tests
- `docs/cdd/CDD-006-OFFICE-UI.md`
- `CHANGELOG.md`

## Explicit non-goals

- Provider discovery or connection-state changes.
- New assets or animation frames.
- Motion that bypasses user or operating-system reduced-motion preferences.

## Acceptance criteria

- [x] Empty-state mascots advance the five-frame sprite.
- [x] Reduced motion pins frame one.
- [x] Agent-card animation remains unchanged.
- [x] Visual and automated verification pass.
- [x] Independent review passes.

## Verification

- [x] Targeted tests
- [x] `pnpm check`
- [x] Privacy/security impact recorded
- [x] Handoff complete

## Handoff

- Task / owner: Issue #38 / Coordinator (Dex)
- Outcome: Empty, degraded, disconnected, and workspace-required mascots now
  use the same five-frame blink loop as populated Office characters.
- Files changed: Empty-state rendering, CSS selectors, webview tests, CDD,
  changelog, and this task.
- Contract decisions: Empty-state motion receives the existing reduced-motion
  preference explicitly and introduces no separate animation state.
- Verification performed and result: Targeted tests passed 3 files / 13 tests;
  `pnpm check` passed 24 files / 195 tests; independent review approved.
- Privacy/security impact: No new data, assets, persistence, telemetry, paths,
  or network behavior.
- Known limitations: A still screenshot cannot demonstrate motion; the rebuilt
  Extension Development Host must be observed for at least one full loop.
- Follow-ups / dependencies: None.
- Exact reviewer reproduction steps: Run `pnpm dev`, close the existing
  Development Host, press F5 with no workspace, and watch the empty mascot blink;
  then enable reduced motion and confirm it remains on frame one.
