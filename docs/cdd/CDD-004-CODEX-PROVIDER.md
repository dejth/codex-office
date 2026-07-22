# CDD-004 — Codex Provider Contract

Status: Capability negotiation implemented for Codex CLI 0.138.0

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

## Capability gate

- Support is an exact allowlist for `0.138.0`; every other version degrades until its generated schema and contract suite pass.
- The implemented mode is partial `snapshot-polling` using `initialize`, `thread/loaded/list`, and `thread/read`.
- Required notification names are pinned schema evidence, not proof of observation or subscription.
- The capability result reports `hierarchyPolling: true`, `usage: false`, and `liveUpdates: false`; it never describes the overall adapter as fully supported.
- Experimental API remains disabled. A privacy-reviewed usage/live attachment contract is required before those capabilities can be enabled.
- Capability diagnostics are bounded and content-free. Raw fingerprints, `codexHome`, paths, prompts, and server payloads are never retained.

## Failure behavior

Provider failure never crashes VS Code. UI shows disconnected/degraded, preserves the last timestamped snapshot when safe, and gives a local troubleshooting path.
