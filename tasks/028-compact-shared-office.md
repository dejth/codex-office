# Task: Compact shared Office for large agent teams

Status: Complete
Owner: Coordinator (Dex)
Governing contract: CDD-006
Depends on: Task 026, Task 027

## Context

The live provider can report one main agent and many subagents, but the first
provider-backed preview duplicated every agent in a large visual card and an
expanded accessibility tree. The resulting sidebar required excessive
scrolling and retained a mock logo and clock.

## Owned files

- `src/webview/office-view.tsx`
- `src/webview/main.tsx`
- `src/webview/styles.css`
- `tests/webview/office-view.test.tsx`
- `tests/webview/render-baseline.test.tsx`
- `docs/cdd/CDD-006-OFFICE-UI.md`
- `CHANGELOG.md`
- `tasks/028-compact-shared-office.md`

## Acceptance criteria

- [x] Remove the mock `CO` mark and hard-coded `09:41` clock.
- [x] Keep the main agent prominent while rendering subagents compactly.
- [x] Provide status filters with readable, non-color labels.
- [x] Keep the semantic agent tree available without duplicating it expanded.
- [x] Preserve keyboard access, selection, reduced motion, and narrow layouts.
- [x] Pass `pnpm check`.
- [x] Remove decorative station rings and patterned room background.
- [x] Move roving keyboard navigation into the visual Office controls.
- [x] Remove the duplicated hierarchy disclosure without reducing access.
- [x] Expose provider-unknown agents through an Unreported filter and count.
- [x] Collapse unavailable Meter thread usage into one truthful compact state.

## Handoff

- Outcome: Office now uses a compact shared-room grid with a prominent main
  agent, smaller subagents, status filters, truthful room chrome, and a
  collapsed semantic hierarchy.
- Verification: `pnpm check` passed 24 files / 205 tests; build and all asset
  budgets passed.
- Privacy/security: presentation-only change; no new provider fields,
  persistence, telemetry, or network access.
- Maintainer reproduction: package and force-install the local VSIX, reload
  VS Code with this repository open, then inspect Office with All and each
  status filter.
- Maintainer sign-off: completed after compact-card, label-readability, and
  `Unreported` wording revisions in the packaged VSIX.
