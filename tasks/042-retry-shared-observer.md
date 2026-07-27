# Task: Recover the shared observer after fallback

Status: Verified
Owner: Dex (coordinator)
Governing contract: CDD-004, ADR-0005
Depends on: Issue #42, Task 042 status-source slice

## Context

A transient shared-socket failure makes the provider fall back safely to
persisted inventory, but the connected fallback is then reused forever. Later
polls never attempt to recover the explicitly enabled shared observer.

## Owned files

- `src/providers/codex/provider.ts`
- provider lifecycle tests
- CDD-004, ADR-0005, changelog, and this task

## Explicit non-goals

- Starting, stopping, or configuring the shared daemon.
- Reading prompts, turns, commands, paths, or notification content.
- Retrying an unavailable endpoint without a cooldown.

## Acceptance criteria

- [x] A transient initial shared failure falls back without losing inventory.
- [x] A later refresh retries shared observation after a bounded cooldown.
- [x] Successful recovery switches snapshot provenance to Shared observer.
- [x] Failed retries remain on a usable persisted inventory snapshot.

## Verification

- [x] Targeted tests: 29 passed across provider and extension lifecycle tests.
- [x] `pnpm check`: 24 files / 217 tests passed; typecheck, lint, format,
      build, and budgets passed.
- [x] Privacy/security impact recorded in CDD-004 and ADR-0005.
- [x] Handoff complete

## Handoff

- Task / owner: Issue #42 shared recovery / Dex
- Outcome: a connected persisted fallback retries the explicitly enabled
  shared observer after a ten-second cooldown and switches provenance on
  success.
- Files changed: provider lifecycle, provider tests, CDD-004, ADR-0005,
  changelog, and this task.
- Contract decisions: retries never start or configure the daemon; failures
  reconnect private inventory and retain the last safe snapshot.
- Verification performed and result: focused 29/29; `pnpm check` 217/217 plus
  typecheck, lint, formatting, build, and budget checks passed.
- Privacy/security impact: retry uses the existing owner-only local socket and
  bounded metadata contract; no new data fields or persistence were added.
- Known limitations: live state exists only for tasks loaded into the shared
  daemon; private VS Code Codex tasks remain Unreported.
- Follow-up: install the VSIX and verify Shared observer plus Thinking to Idle
  against a task launched with `codex --remote unix://`.
- Reproduction: keep the remote CLI open, reload VS Code, and submit a task
  lasting longer than the two-second Office polling interval.
