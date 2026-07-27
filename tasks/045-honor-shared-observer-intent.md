# Task: Honor shared observer intent in Extension Host

Status: Verified
Owner: Dex
Governing contract: CDD-004, ADR-0005
Depends on: Task 044

## Context

The extension activation path preflights the shared socket before selecting a
transport even though the Unix transport securely validates the same socket at
connection time. A false preflight result inside Extension Host can select the
private stdio provider indefinitely despite the experimental setting being
enabled and the owner-only socket being usable.

## Owned files

- `src/extension/extension.ts`
- `tests/extension/activation.test.ts`
- `docs/cdd/CDD-004-CODEX-PROVIDER.md`
- `docs/decisions/ADR-0005-OPT-IN-SHARED-APP-SERVER-STATUS.md`
- `CHANGELOG.md`
- `tasks/045-honor-shared-observer-intent.md`

## Explicit non-goals

- Weakening socket ownership or permission checks.
- Accepting remote endpoints or custom socket paths.
- Starting or controlling the shared daemon.
- Reading content-bearing notifications.

## Acceptance criteria

- [x] Enabling the setting selects the Unix transport without a duplicate
      activation-time filesystem gate.
- [x] The Unix transport remains the sole owner/permission validation boundary.
- [x] A connection failure still falls back to private persisted inventory.
- [x] Activation tests and `pnpm check` pass.
- [x] Privacy/security impact and handoff are recorded.

## Verification

- [x] Targeted activation tests
- [x] `pnpm check`
- [x] Privacy/security impact recorded
- [x] Handoff complete

## Handoff

- Task / owner: Honor shared observer intent / Dex
- Outcome: The enabled setting now selects the Unix shared transport directly;
  the transport performs the authoritative secure socket validation itself.
- Files changed: activation wiring, activation tests, CDD-004, ADR-0005,
  changelog, task.
- Contract decisions: User intent and endpoint security are separate. The
  checkbox requests Shared observer; the Unix transport accepts only the fixed
  owner-only `0600` socket and otherwise fails into private inventory.
- Verification performed and result: Exact live provider probe connected as
  Shared observer with two idle and seven Unreported agents; activation tests
  passed 2/2; `pnpm check` passed 24 files / 219 tests, lint, formatting,
  build, and bundle budgets.
- Privacy/security impact: No security validation was removed from the
  connection boundary, no endpoint became configurable, and no additional
  data was read or retained.
- Known limitations: Only tasks loaded into the managed shared daemon expose
  basic live status; private App Server sessions remain Unreported.
- Follow-ups / dependencies: Install the VSIX, reload VS Code, and confirm the
  source badge changes from Persisted inventory to Shared observer.
- Exact reviewer reproduction steps: Enable the setting with the secure
  default socket present, reload VS Code, and inspect the source badge. Run
  `codex --remote unix://`, submit a task, and confirm Thinking then Idle.
