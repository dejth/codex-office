# Task: Stabilize shared recovery and status UI

Status: Verified
Owner: Dex
Governing contract: CDD-004, CDD-006, ADR-0005
Depends on: Task 042 retry shared observer

## Context

The visible webview polls every two seconds. When the experimental shared
observer is unavailable, every ten-second recovery attempt temporarily emits a
degraded snapshot before the private inventory fallback reconnects. This makes
the sidebar warning flash even though safe inventory remains available.

## Owned files

- `src/providers/codex/provider.ts`
- `tests/providers/codex-provider.test.ts`
- `docs/cdd/CDD-004-CODEX-PROVIDER.md`
- `docs/decisions/ADR-0005-OPT-IN-SHARED-APP-SERVER-STATUS.md`
- `CHANGELOG.md`
- `tasks/044-stabilize-shared-retry-ui.md`

## Explicit non-goals

- Guessing live status from persisted sessions.
- Reading turns, prompts, commands, or token usage.
- Starting, resuming, or controlling Codex sessions.
- Changing the two-second metadata polling interval.

## Acceptance criteria

- [x] A failed shared probe does not emit a transient degraded snapshot when
      fallback recovery succeeds.
- [x] A successful shared retry publishes Shared observer provenance and the
      reported loaded-thread status.
- [x] Failure of both shared and fallback providers remains visibly degraded.
- [x] Provider tests and `pnpm check` pass.
- [x] Privacy/security impact and handoff are recorded.

## Verification

- [x] Targeted provider tests
- [x] `pnpm check`
- [x] Privacy/security impact recorded
- [x] Handoff complete

## Handoff

- Task / owner: Stable shared recovery and status UI / Dex
- Outcome: Shared recovery probes no longer publish a transient degraded
  snapshot when persisted fallback recovery succeeds. Successful recovery
  still publishes Shared observer provenance and loaded-thread status.
- Files changed: provider, provider tests, CDD-004, ADR-0005, changelog, task.
- Contract decisions: Preserve the last safe connected snapshot during an
  internal shared probe; expose degradation only after both sources fail.
- Verification performed and result: Live content-free 0.145.0 probe found 24
  workspace sessions, one relevant loaded thread with idle status; targeted 24
  provider tests passed; `pnpm check` passed 24 files / 218 tests, lint,
  formatting, build, and bundle budgets.
- Privacy/security impact: No prompt, turn, command, filesystem path, raw
  identifier, or token value is projected or retained. Existing read-only
  metadata requests and owner-only socket checks are unchanged.
- Known limitations: The checkbox permits observation but does not start the
  shared daemon. Only sessions launched through the shared daemon can report
  live status; private VS Code sessions remain Unreported.
- Follow-ups / dependencies: Install the VSIX, reload VS Code, run
  `codex --remote unix://` in this workspace, and verify Thinking to Idle.
- Exact reviewer reproduction steps: Enable the experimental shared setting,
  keep the sidebar visible with fallback inventory, stop or make the shared
  socket unavailable for one retry interval, and confirm no warning flashes.
  Restore the socket and run a remote task; confirm the source becomes Shared
  observer and the loaded card changes status.
