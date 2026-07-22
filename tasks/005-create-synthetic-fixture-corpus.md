# Task: Create synthetic nested-agent fixture corpus

Status: Complete
Owner: Coordinator (Dex)
Governing contract: CDD-004
Depends on: Issue #1

## Context

Issue #2 turns the version-pinned provider evidence into deterministic, privacy-safe inputs and expected normalized outcomes for future provider and domain implementation.

## Owned files

- `tasks/005-create-synthetic-fixture-corpus.md`
- `tests/fixtures/codex/README.md`
- `tests/fixtures/codex/corpus/`
- `tests/providers/codex-fixture-corpus.test.ts`
- `docs/cdd/CDD-005-USAGE.md`
- `CHANGELOG.md`

## Explicit non-goals

- Implementing the production provider or domain normalizer.
- Capturing real App Server traffic, prompts, transcripts, rollout content, credentials, or user filesystem paths.
- Treating synthetic examples as proof of live notification ordering.

## Acceptance criteria

- [x] Cover missing fields, malformed input, duplicate events, nested subagents, resume, and replay.
- [x] Use deterministic identifiers and timestamps.
- [x] Document fixture intent and expected normalized output.
- [x] Confirm fixtures contain no real user or workspace data.

## Verification

- [x] Targeted tests
- [x] `pnpm check`
- [x] Privacy/security impact recorded
- [x] Handoff complete

## Handoff

- Task / owner: Issue #2 / Coordinator (Dex)
- Outcome: Twelve deterministic synthetic cases now define hierarchy, boundary, duplicate, replay, resume, regression, epoch reset, integer boundary, and per-thread usage behavior.
- Files changed: Task record, CDD-005 rule clarification, fixture guide, twelve JSON cases, corpus contract tests, and changelog.
- Contract decisions: Cumulative monotonicity uses `totalTokens` within one connection epoch; accepted snapshots replace all components as a unit; new epochs reset deduplication identity.
- Verification performed and result: `pnpm check` passed with 3 test files and 31 tests.
- Privacy/security impact: No real App Server traffic or user/workspace data was read or committed. Automated forbidden-key/value guards and manual string review passed.
- Known limitations: The corpus uses minimized protocol projections and does not prove live event ordering. Production normalization begins in later issues.
- Follow-ups / dependencies: Issue #3 implements domain hierarchy validation against these cases.
- Exact reviewer reproduction steps: Run `pnpm check`, then inspect every JSON file under `tests/fixtures/codex/corpus/` against `tests/fixtures/codex/README.md`.
