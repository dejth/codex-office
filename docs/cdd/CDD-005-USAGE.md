# CDD-005 — Usage Accounting Contract

Status: Draft

Evidence baseline: [ADR-0003](../decisions/ADR-0003-CODEX-APP-SERVER-EVIDENCE.md)

## Labels

- **Reported:** value scoped and emitted by Codex for a thread/turn.
- **Derived:** deterministic arithmetic from compatible reported values.
- **Estimated:** heuristic; visually distinct and disabled by default.

## Rules

- Store input, cached input, output, and total separately when available.
- Never add cumulative snapshots together.
- For App Server v2, replace `tokenUsage.total` by `threadId`; treat `tokenUsage.last` as the latest model-call breakdown and replay on attach as historical state.
- If `tokenUsage.total.totalTokens` decreases within the same connection epoch, retain the last safe snapshot and degrade with a counter-regression diagnostic. Accept the first valid snapshot after an explicit new epoch as a replacement. When a snapshot is accepted, replace all reported components as one unit rather than applying component-wise monotonicity.
- Deduplicate with stable event identity where available; otherwise use documented monotonic/scope rules.
- Parent context appearing in a child is not automatically removable; expose raw reported per-thread usage until semantics are proven.
- Do not display account quota, credits, currency cost, or billing claims without a verified account API and separate consent.
- Use safe integers and test overflow/precision boundaries.

## Acceptance matrix

New cumulative event, same event repeated, out-of-order event, process restart, resume, child spawn with replayed context, missing cached field, counter reset, and conflicting total/components.
