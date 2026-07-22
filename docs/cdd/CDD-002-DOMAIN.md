# CDD-002 — Domain Model Contract

Status: Draft

The domain is provider-neutral even though Codex is the sole provider. It models `OfficeSnapshot`, `AgentNode`, `AgentStatus`, and `TokenUsage`.

## Invariants

- Agent IDs are unique within a snapshot.
- Roots have `parentId: null`; every non-root parent must exist or the node is placed in an `unresolved` group.
- Cycles are invalid and surfaced as degraded provider data.
- Unknown status is preserved.
- Missing usage is `null`, never zero.
- Totals retain provenance and cannot silently combine incompatible scopes.
- Ordering is deterministic: main/root first, then start time if known, then stable ID.

## Required tests

No agents, one main agent, siblings, three-level nesting, orphan, cycle, duplicate ID, status transition, missing usage, and resumed snapshot.
