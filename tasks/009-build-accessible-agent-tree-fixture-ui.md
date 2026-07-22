# Task: Build accessible agent tree fixture UI

Status: Complete
Owner: Coordinator (Dex) with UI agent
Governing contract: CDD-006
Depends on: Issues #3 and #5

## Context

Issue #6 delivers the first meaningful dev-preview UI: a deterministic agent hierarchy rendered from sanitized synthetic fixtures without a live Codex session.

## Owned files

- `src/webview/main.tsx` — UI agent
- `src/webview/styles.css` — UI agent
- `src/webview/agent-tree.tsx` — UI agent
- `src/webview/state.ts` — Coordinator
- `src/protocol/preview-fixture.ts` — Coordinator
- `src/extension/view-provider.ts` — Coordinator
- `tests/webview/agent-tree.test.tsx` — UI agent
- `tasks/009-build-accessible-agent-tree-fixture-ui.md` — Coordinator
- `docs/cdd/CDD-006-OFFICE-UI.md` — Coordinator
- `CHANGELOG.md` — Coordinator

## Explicit non-goals

- Connecting to a live Codex session or reading the filesystem/network.
- Implementing the Office animation state machine from Issue #7.
- Implementing Meter usage visualization from Issue #8.
- Rendering raw provider, prompt, transcript, command, or path data.

## Acceptance criteria

- [x] Render main and nested agents from sanitized synthetic fixtures.
- [x] Support keyboard navigation and screen readers.
- [x] Provide icon-and-text status cues and narrow-width behavior.
- [x] Add deterministic UI and accessibility tests without a live Codex session.

## Verification

- [x] Targeted tests
- [x] `pnpm check`
- [x] Privacy/security impact recorded
- [x] Handoff complete

## Agent handoff

- Task / owner: Issue #6 / Coordinator (Dex), with independent UI/accessibility reviewer.
- Outcome: Added a meaningful fixture preview with a semantic nested agent tree, persistent selection across modes, deterministic keyboard navigation, accessible status/usage names, and compact layout.
- Files changed: See the owned-files list above.
- Contract decisions: Preview data is an explicit sanitized host snapshot; later snapshots, including empty ones, replace it atomically. Tree focus and selection are separate state.
- Verification performed and result: UI tests pass (4); full `pnpm check` passes (7 files, 87 tests).
- Privacy/security impact: Preview identifiers and labels are synthetic. The webview adds no filesystem access, process execution, network calls, telemetry, or persistence.
- Known limitations: The tree is intentionally always expanded for v0.1. Tests cover semantic markup and pure navigation/focus behavior, while browser-level key/click/focus simulation remains a non-blocking integration-test gap.
- Follow-ups / dependencies: Issue #7 consumes the tree while keeping animation state separate from snapshot state; Issue #9 should add browser-level interaction coverage. Meter is Issue #8, and live provider wiring remains later integration work.
- Exact reviewer reproduction steps: Run `pnpm test -- tests/webview/agent-tree.test.tsx`, then `pnpm check`; launch the Extension Development Host with `pnpm dev` and `F5` to inspect keyboard and narrow-width behavior.
