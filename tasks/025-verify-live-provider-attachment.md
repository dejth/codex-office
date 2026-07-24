# Task: Verify privacy-safe live provider attachment

Status: Complete
Owner: Coordinator (Dex)
Governing contract: CDD-004, CDD-005
Depends on: Task 024, Issue #42

## Context

The production adapter currently starts a separate App Server and polls
state-database thread metadata. That mode cannot observe trustworthy live
statuses or token usage from Codex processes owned by another client. Before
enabling live Office and Meter behavior, the project needs version-pinned
evidence for a content-minimizing attachment contract.

## Owned files

- `docs/decisions/`
- `docs/cdd/CDD-004-CODEX-PROVIDER.md`
- `docs/cdd/CDD-005-USAGE.md`
- `tests/fixtures/codex/`
- Provider capability and boundary tests required by the evidence
- `tasks/025-verify-live-provider-attachment.md`

## Explicit non-goals

- Reading or persisting prompts, turns, commands, file paths, or transcripts.
- Displaying account quota, billing, credits, or cross-thread token totals.
- Agent steering, termination, prompt submission, or approval actions.
- Changing Office or Meter presentation before the provider contract is
  accepted.

## Acceptance criteria

- [x] Record the exact tested Codex version and generated schema evidence.
- [x] Identify a bounded lifecycle and usage attachment path, or document the
      confirmed blocker without guessing.
- [x] Prove which root, child, nested-child, status, and token fields can be
      retained while discarding content-bearing fields.
- [x] Define capability gates, failure behavior, reconnection, and replay rules.
- [x] Add sanitized fixture-backed tests for accepted boundary data.
- [x] Record privacy and security implications in an ADR.

## Verification

- [x] Targeted tests
- [x] `pnpm check`
- [x] Privacy/security impact recorded
- [x] Handoff complete

## Handoff

- Task / owner: Task 025 / Coordinator (Dex)
- Outcome: Verified the exact Codex CLI 0.138.0 structural spawn fallback and
  bounded account-capacity API. Confirmed that the Codex desktop App Server is
  private stdio and cannot provide a safe cross-process live subscription.
- Contract decisions: ADR-0004 accepts only spawn parent/depth/generated label
  metadata and primary/secondary account-window capacity. Thread resume,
  rollouts, credits, paths, content, and raw provider payloads remain excluded.
- Live sanitized evidence: the workspace projected one root, nineteen
  subagents, nineteen generated labels, and an available primary capacity
  window without retaining identifiers, paths, values, or transcript content.
- Verification: provider/capability/protocol/Meter tests passed; `pnpm check`
  passed 24 files / 201 tests.
- Follow-up: Task 026 owns the maintainer F5 presentation review.
