# Task: Verify current Codex App Server hierarchy and token semantics

Status: Complete
Owner: Coordinator (Dex)
Governing contract: CDD-004, CDD-005
Depends on: None

## Context

Issue #1 establishes an evidence-backed provider contract before production parsing begins.

## Owned files

- `tasks/004-verify-current-codex-app-server-semantics.md`
- `docs/decisions/ADR-0003-CODEX-APP-SERVER-EVIDENCE.md`
- `docs/cdd/CDD-004-CODEX-PROVIDER.md`
- `docs/cdd/CDD-005-USAGE.md`
- `tests/fixtures/codex/app-server-0.138.0-hierarchy-usage.json`
- `tests/providers/codex-evidence.test.ts`
- `CHANGELOG.md`

## Explicit non-goals

- Implementing or connecting the production provider.
- Reading or committing real prompts, transcripts, rollout files, credentials, or filesystem paths.
- Claiming billing accuracy or account-level usage semantics.
- Depending on experimental protocol fields without capability guards.

## Acceptance criteria

- [x] Document tested Codex versions and capability detection.
- [x] Verify the versioned identifier fields used to model root, child, and nested-child relationships; record live-emission limits.
- [x] Determine whether usage events are cumulative or incremental and at which scope.
- [x] Record sanitized evidence, failure behavior, and conclusions in an ADR.

## Verification

- [x] Targeted tests
- [x] `pnpm check`
- [x] Privacy/security impact recorded
- [x] Handoff complete

## Handoff

- Task / owner: Issue #1 / Coordinator (Dex)
- Outcome: Version-scoped hierarchy, usage snapshot, replay, and capability conclusions recorded for Codex CLI 0.138.0.
- Files changed: Task record, ADR-0003, CDD-004, CDD-005, synthetic evidence fixture and tests, changelog.
- Contract decisions: Use `parentThreadId` as the direct edge within `sessionId`; replace cumulative usage by `threadId`; label Codex-emitted values reported, not billing-accurate.
- Verification performed and result: `pnpm check` passed with 2 test files and 4 tests.
- Privacy/security impact: No real session data was read or committed. Sensitive thread fields are explicitly discarded at the provider boundary.
- Known limitations: Live nested emission, cross-thread ordering, reset behavior, and complete server capability negotiation remain unverified.
- Follow-ups / dependencies: Issue #2 builds the full synthetic fixture corpus; Issue #3 implements domain validation.
- Exact reviewer reproduction steps: Run `codex --version`, generate stable and experimental schemas into a temporary directory, compare with `rust-v0.138.0`, then run `pnpm check`.
