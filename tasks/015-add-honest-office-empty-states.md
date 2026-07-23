# Task: Add honest Office empty and unavailable states

Status: Complete
Owner: Webview agent (Dex)
Governing contract: CDD-006
Depends on: Issue #23

## Context

The production Office rendered an empty room with fixture-oriented `Synthetic
data` and `Live office preview` labels. Provider failures also collapsed into
generic notices, so users could not distinguish installation, compatibility,
transport, or validation failures.

## Owned files

- `src/webview/**`
- `tests/webview/**`
- `docs/cdd/CDD-006-OFFICE-UI.md`
- `CHANGELOG.md`
- `tasks/015-add-honest-office-empty-states.md`

## Explicit non-goals

- Provider discovery, domain projection, steering, or session mutation.
- Telemetry, network requests, remote persistence, publishing, or release work.
- Displaying provider paths, commands, payloads, prompts, or session content.

## Acceptance criteria

- [x] Remove production synthetic and misleading live labels.
- [x] Preserve the bounded connection reason in webview state.
- [x] Render safe, specific executable, transport, version, and data notices.
- [x] Render readable connected, degraded, and disconnected Office empty states.
- [x] Use existing local pixel art decoratively.
- [x] Preserve theme, high-contrast, narrow-width, and reduced-motion gates.
- [x] Add deterministic behavior and visual baseline tests.
- [x] Review visually in the Extension Development Host.
- [x] Run `pnpm check`.

## Handoff

- Task / owner: Issue #24 / Webview agent (Dex)
- Outcome: Replaced fixture-oriented production labels with honest local-session
  language and added reason-aware notices plus accessible empty states.
- Files changed: Webview state, notice, Office rendering and styles; focused
  tests; CDD-006; changelog; this task record.
- Contract decisions: Connection reasons remain bounded protocol enums. Empty
  artwork is decorative and readable text carries all state meaning.
- Verification performed and result: Targeted webview tests passed; `pnpm
check` passed 23 files / 178 tests. Extension Development Host review confirmed
  the production failed-state artwork, responsive sidebar layout, readable
  heading/detail, and the preserved unsupported-version diagnostic.
- Privacy/security impact: No new data source, persistence, telemetry, network
  call, or sensitive provider detail is exposed.
- Known limitations: Cross-process sessions can remain `unknown` because the
  supported provider interface does not expose authoritative live status.
- Follow-ups / dependencies: Merge after CI.
- Exact reviewer reproduction steps: Run `pnpm check`, launch the Extension
  Development Host, and inspect the Office with no workspace Codex sessions.
