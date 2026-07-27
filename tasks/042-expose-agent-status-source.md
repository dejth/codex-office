# Task: Expose the agent status source

Status: Verified
Owner: Dex (coordinator)
Governing contract: CDD-003, CDD-004, CDD-006, ADR-0005
Depends on: Issue #42, Task 039

## Context

The shared daemon can be healthy while containing zero loaded threads. In that
case persisted workspace sessions correctly remain Unreported, but the Office
does not tell users whether it is observing the shared daemon or using private
inventory fallback.

## Owned files

- `src/domain/model.ts`
- `src/providers/codex/provider.ts`
- `src/protocol/`
- `src/webview/office-view.tsx`
- corresponding tests and synthetic fixtures
- CDD, ADR, changelog, and this task file

## Explicit non-goals

- Claiming a persisted timestamp proves live activity.
- Reading turns, prompts, commands, paths, or notification content.
- Starting or steering Codex agents from the extension.

## Acceptance criteria

- [x] Every snapshot identifies shared observer, persisted inventory, or no source.
- [x] Shared status and persisted inventory receive distinct non-color labels.
- [x] Zero loaded shared threads are not mislabeled as a failure.
- [x] Protocol validation rejects unknown source values.

## Verification

- [x] Targeted tests: 73 passed across provider, protocol, Office, and host tests.
- [x] `pnpm check`: 24 files / 215 tests passed; lint, format, build, and budgets passed.
- [x] Privacy/security impact recorded in ADR-0005 and CDD-004.
- [x] Handoff complete

## Handoff

- Task / owner: Issue #42 status-source slice / Dex
- Outcome: Every snapshot and populated or empty Agent floor identifies its
  bounded source as Shared observer, Persisted inventory, or unavailable.
- Files changed: domain snapshot, Codex provider, webview protocol/UI/styles,
  tests, CDDs, ADR-0005, changelog, and this task.
- Contract decisions: protocol v3 adds only a nullable bounded enum; zero
  shared loaded threads remains a healthy shared observation, not an error.
- Verification performed and result: focused 73/73; `pnpm check` 215/215 plus
  typecheck, lint, formatting, build, and budget checks passed.
- Privacy/security impact: no socket path, executable path, prompt, turn,
  command, or notification content is projected or persisted.
- Known limitations: existing tasks owned by private App Server processes stay
  Unreported even while the shared daemon is healthy.
- Follow-up: run a task through `codex --remote unix://` for human runtime
  acceptance before closing Issue #42.
- Reproduction: enable the experimental shared setting, reload VS Code, then
  compare the Agent floor source badge before and during a remote task.
