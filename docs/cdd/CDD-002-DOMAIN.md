# CDD-002 — Domain Model Contract

Status: Verified

The domain is provider-neutral even though Codex is the sole provider. It models `OfficeSnapshot`, `AgentNode`, `AgentStatus`, and `TokenUsage`.

## Invariants

- Agent IDs are unique within a snapshot.
- Roots have `parentId: null`; every non-root parent must exist or the node is placed in an `unresolved` group.
- Cycles are invalid and surfaced as degraded provider data.
- Unknown status is preserved.
- Missing usage is `null`, never zero.
- Totals retain provenance and cannot silently combine incompatible scopes.
- Ordering is deterministic: main/root first, then start time if known, then stable ID.

## Hierarchy validation result

`buildAgentHierarchy` accepts provider-neutral flat agent records and returns valid root trees, unresolved records, and deterministic diagnostics.

- All occurrences of a duplicate ID are unresolved; no arrival-order winner is selected.
- Missing-parent and cycle members are unresolved. Their descendants are marked `blocked-by-invalid-parent` rather than promoted or silently reparented.
- Unresolved records remain separate from valid roots and retain their original agent identity plus an explicit reason.
- Invalid non-null start times are diagnosed and ordered with unknown timestamps.
- Roots and siblings sort by valid start time, then by locale-independent stable ID. Input order does not affect output.
- Each call is a full deterministic rebuild. A resumed full snapshot therefore replaces prior membership; partial or paginated inputs must not use this API.

## Required tests

No agents, one main agent, siblings, three-level nesting, orphan, cycle, duplicate ID, status transition, missing usage, and resumed snapshot.
