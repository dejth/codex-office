# CDD-005 — Usage Accounting Contract

Status: Draft

## Labels

- **Reported:** value scoped and emitted by Codex for a thread/turn.
- **Derived:** deterministic arithmetic from compatible reported values.
- **Estimated:** heuristic; visually distinct and disabled by default.

## Rules

- Store input, cached input, output, and total separately when available.
- Never add cumulative snapshots together.
- Deduplicate with stable event identity where available; otherwise use documented monotonic/scope rules.
- Parent context appearing in a child is not automatically removable; expose raw reported per-thread usage until semantics are proven.
- Do not display account quota, credits, currency cost, or billing claims without a verified account API and separate consent.
- Use safe integers and test overflow/precision boundaries.

## Acceptance matrix

New cumulative event, same event repeated, out-of-order event, process restart, resume, child spawn with replayed context, missing cached field, counter reset, and conflicting total/components.
