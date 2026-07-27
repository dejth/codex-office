# CDD-005 — Usage Accounting Contract

Status: Verified for v0.1 reported account-capacity model

Evidence baseline: [ADR-0003](../decisions/ADR-0003-CODEX-APP-SERVER-EVIDENCE.md)
and [ADR-0004](../decisions/ADR-0004-STATE-DB-SPAWN-AND-ACCOUNT-CAPACITY.md)

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

## Thread-usage model

- The display model preserves each sanitized thread's input, cached input,
  output, total, and provenance without coercing missing values to zero.
- The product does not combine cumulative values across visible threads because
  parent/child context may overlap.
- A component that would exceed `Number.MAX_SAFE_INTEGER` fails closed to unavailable without hiding other safe components.
- Equal values, replay-like values, and parent/child context are neither deduplicated nor added without stable evidence. The UI labels the scope as visible thread snapshots and warns that context may overlap.
- Thread usage remains hidden while the current provider cannot report it.
- A token summary printed when a CLI session exits is user-facing output, not
  a supported integration boundary. Providers must not parse terminal output,
  shell history, or rollout JSONL to populate agent usage.
- The metadata-only shared observer keeps `usage: false`: current App Server
  usage notifications are delivered only to connections subscribed to the
  thread, and there is no content-free cumulative usage read request.
- Per-agent usage may be enabled only after Codex exposes an official read-only
  source that does not resume, attach to, reconstruct, or take ownership of a
  thread. Reasoning and cache-write components require an explicit domain and
  webview protocol revision before presentation.

## Account-capacity presentation

- `account/rateLimits/read` is exact-version evidence for reported account
  windows, not thread token usage or billing.
- Retain only primary and secondary percentage used, window duration, and
  canonical reset time. Discard plan, credits, balances, limit names and IDs,
  spend controls, and raw bucket data.
- Display each available window independently in the compact account overview
  with `reported` provenance and `not billing data` copy.
- Read at most once per minute while connected. Failure or malformed account
  capacity remains unavailable and does not replace safe hierarchy state.
- Never derive per-thread tokens, cost, or cross-thread usage from an account
  percentage.
