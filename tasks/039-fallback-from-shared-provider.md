# Task: Fall back safely from shared provider failure

Status: Verified
Owner: Coordinator (Dex)
Governing contract: CDD-004, ADR-0005
Depends on: Issue #45, Task 038

## Context

The installed extension can fail to initialize its experimental shared
transport inside the VS Code Extension Host even while an isolated bounded
probe succeeds. Initial shared failure currently empties the whole Office
instead of preserving the private snapshot provider required by ADR-0005.

## Owned files

- `src/providers/codex/provider.ts`
- `src/extension/extension.ts`
- provider and activation tests
- `docs/cdd/CDD-004-CODEX-PROVIDER.md`
- `docs/decisions/ADR-0005-OPT-IN-SHARED-APP-SERVER-STATUS.md`
- `CHANGELOG.md`
- this task

## Explicit non-goals

- Treating fallback inventory as live shared status.
- Reading content-bearing events or increasing payload limits.
- Adding remote endpoints or automatic daemon management.

## Acceptance criteria

- [x] Initial shared transport failure retries through private stdio.
- [x] A successful fallback preserves hierarchy and reported account capacity.
- [x] Unsupported or invalid provider data still fails closed.
- [x] Tests and documentation cover the fallback boundary.

## Verification

- [x] Targeted tests: 22 passed
- [x] `pnpm check`: 24 files and 210 tests passed
- [x] Privacy/security impact recorded
- [x] Handoff complete

## Handoff

- Outcome: Initial shared transport failure now falls back to the private
  workspace snapshot provider instead of emptying the Office.
- Contract decisions: Fallback inventory remains `Unreported` and is never
  labeled as live shared status.
- Verification: 22 targeted tests, full `pnpm check` with 210 tests, package
  validation, VSIX installation, and maintainer runtime verification passed.
- Privacy/security impact: No new fields or payloads are retained. Fallback
  uses the existing content-minimizing, workspace-scoped private provider.
- Known limitations: The current 22 persisted VS Code threads expose zero
  canonical or spawn-source parent edges, so all remain evidence-based roots.
- Follow-ups: Continue Issue #42 only when a provider surface exposes verified
  subagent parent metadata or per-thread reported usage.
- Exact reviewer reproduction steps:
  1. Enable the experimental shared setting with the daemon available.
  2. Install the VSIX and reload VS Code.
  3. Confirm a shared connection failure preserves Usage and root inventory.
  4. Confirm fallback agent status remains `Unreported`.
