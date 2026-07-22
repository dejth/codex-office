# Task: Implement domain hierarchy validation

Status: Complete
Owner: Coordinator (Dex) with Domain agent
Governing contract: CDD-002
Depends on: Issue #2

## Context

Issue #3 implements the provider-neutral, pure transformation that validates flat agent records and produces deterministic hierarchy output backed by the synthetic corpus.

## Owned files

- `src/domain/hierarchy.ts`
- `src/domain/model.ts` if a public domain result type is required
- `tests/domain/hierarchy.test.ts`
- `tasks/006-implement-domain-hierarchy-validation.md`
- `docs/cdd/CDD-002-DOMAIN.md`
- `CHANGELOG.md`

## Explicit non-goals

- Parsing Codex App Server wire messages.
- Reading filesystem, network, transcript, rollout, or path data.
- Usage aggregation across agents or sessions.
- UI rendering or provider-specific status mapping.

## Acceptance criteria

- [x] Validate parent-child relationships and reject cycles.
- [x] Represent unknown and malformed states explicitly.
- [x] Preserve stable ordering and deterministic output.
- [x] Add fixture-backed unit tests for hierarchy invariants.

## Verification

- [x] Targeted tests
- [x] `pnpm check`
- [x] Privacy/security impact recorded
- [x] Handoff complete

## Handoff

- Task / owner: Issue #3 / Coordinator (Dex) with Domain agent
- Outcome: A pure provider-neutral builder now validates flat agent relationships and returns deterministic valid roots, explicitly reasoned unresolved records, and content-free diagnostics.
- Files changed: Domain hierarchy module and fixture-backed tests, CDD-002, task record, and changelog.
- Contract decisions: Quarantine every duplicate occurrence; quarantine cycles, missing-parent nodes, and descendants blocked by invalid parents; sort by canonical UTC start time then locale-independent stable ID.
- Verification performed and result: `pnpm check` passed with 4 test files and 42 tests, including a 10,000-level non-recursive hierarchy stress test.
- Privacy/security impact: Production transformation is pure with no filesystem/network/provider imports. Malformed raw timestamps are never copied into diagnostics.
- Known limitations: This API accepts a complete provider-neutral snapshot; provider wire parsing, partial pagination, and state retention remain later tasks.
- Follow-ups / dependencies: Issue #4 adds provider capability negotiation before the adapter consumes domain validation.
- Exact reviewer reproduction steps: Run `pnpm check`; run `pnpm exec vitest run tests/domain/hierarchy.test.ts` for the focused 11-test suite.
