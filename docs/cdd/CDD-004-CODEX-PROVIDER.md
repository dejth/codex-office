# CDD-004 — Codex Provider Contract

Status: Investigated for Codex CLI 0.138.0

Evidence baseline: [ADR-0003](../decisions/ADR-0003-CODEX-APP-SERVER-EVIDENCE.md)

## Strategy

1. Prefer a documented App Server interface when current Codex evidence confirms availability and semantics.
2. Use local rollout parsing only as a fallback with explicit compatibility guards.
3. Normalize data into the domain model before any UI exposure.

## Investigation questions

- How are main, child, and nested child threads identified?
- Are usage events cumulative or incremental, and at what scope?
- What is replayed when a child is spawned or a thread resumes?
- Which events reliably map to state, and what is merely inferred?
- How are version/capability mismatches detected?

## Required evidence

Document tested Codex versions, sanitized event fixtures, field semantics, failure behavior, and source references in an ADR. No production parser may be based solely on remembered or unofficial field names.

The current evidence verifies `Thread.id`, `Thread.sessionId`, and `Thread.parentThreadId` as the version-scoped fields for expressing recursive hierarchy. Live nested emission across every launch path remains unverified. Missing or conflicting relationships must degrade explicitly rather than be guessed. Production parsing remains blocked on fixture-backed boundary validation and version/capability guards.

## Failure behavior

Provider failure never crashes VS Code. UI shows disconnected/degraded, preserves the last timestamped snapshot when safe, and gives a local troubleshooting path.
