# ADR-0003 — Codex App Server v0.138.0 evidence baseline

Status: Proposed

## Context

Codex Office needs a versioned, reproducible basis for hierarchy and token usage before it can implement a production provider. Remembered field names and real user rollout data are not acceptable evidence.

This investigation tested `codex-cli 0.138.0` on 2026-07-22. TypeScript and JSON Schema bindings were generated locally with:

```text
codex app-server generate-ts --experimental --out <temporary-directory>
codex app-server generate-json-schema --experimental --out <temporary-directory>
```

The generated output was compared with the official `openai/codex` release tag [`rust-v0.138.0`](https://github.com/openai/codex/tree/rust-v0.138.0), which resolves to commit [`c18e9f478bc940ef1ef8e1c426364c0fe3d86b73`](https://github.com/openai/codex/tree/c18e9f478bc940ef1ef8e1c426364c0fe3d86b73). Relevant upstream sources are the [v2 thread protocol](https://github.com/openai/codex/blob/c18e9f478bc940ef1ef8e1c426364c0fe3d86b73/codex-rs/app-server-protocol/src/protocol/v2/thread.rs), [core protocol accumulation](https://github.com/openai/codex/blob/c18e9f478bc940ef1ef8e1c426364c0fe3d86b73/codex-rs/protocol/src/protocol.rs), [token usage replay](https://github.com/openai/codex/blob/c18e9f478bc940ef1ef8e1c426364c0fe3d86b73/codex-rs/app-server/src/request_processors/token_usage_replay.rs), and the [App Server API guide](https://github.com/openai/codex/blob/c18e9f478bc940ef1ef8e1c426364c0fe3d86b73/codex-rs/app-server/README.md).

## Decision

### Hierarchy identity

- `Thread.id` is the agent/thread identity used by lifecycle and usage notifications as `threadId`.
- `Thread.sessionId` groups threads belonging to the same session tree.
- A root is represented by `parentThreadId: null`. A spawned child can contain its direct parent's thread ID; applying that direct edge recursively represents nested children.
- `Thread.source` can contain `subagent.thread_spawn` metadata with `parent_thread_id` and `depth`, but this is corroborating metadata rather than the canonical edge. The v2 `parentThreadId` field is the hierarchy edge.
- `forkedFromId` describes a fork, not a parent-child agent edge, and must not be used to build the live agent tree.

### Usage semantics

- `thread/tokenUsage/updated` is scoped by `threadId` and attributed to a `turnId`.
- `tokenUsage.total` is the current cumulative snapshot for that thread. It replaces the previous total and must never be summed with earlier `total` values.
- `tokenUsage.last` is the most recent reported usage increment within that thread. It is not a thread total.
- Both breakdowns report `totalTokens`, `inputTokens`, `cachedInputTokens`, `outputTokens`, and `reasoningOutputTokens`; `modelContextWindow` can be null.
- Resume/attach can replay the latest persisted cumulative snapshot to the attaching connection. The replay is historical state, not a new usage increment, so consumers must replace by thread rather than add it.
- The public notification has no stable event ID. For v0.1, deduplication uses snapshot replacement keyed by `threadId`; `turnId` is attribution metadata, not a uniqueness guarantee.
- Parent usage is not subtracted from child usage. Each thread's reported total remains separate until cross-thread context semantics are proven.

All values from this notification are labeled **reported** because Codex emitted them. Upstream can internally recompute an estimate when exact usage is unavailable, so reported does not mean exact or billable. Any arithmetic across compatible reported fields is labeled **derived**. No value is called billing usage.

### Capability and version detection

At build/test time, schema generation is the reproducible compatibility check. At runtime, the client must:

1. initialize with explicit client information and capability flags;
2. record the returned `userAgent` as the server version fingerprint without exposing `codexHome`;
3. require the stable methods and fields used by the adapter;
4. opt into experimental API only when an explicitly supported adapter needs it; and
5. enter a degraded state for absent methods, invalid payloads, or an unsupported version instead of guessing field names.

Extension Development Host verification on Codex CLI `0.138.0` additionally
observed the bounded runtime prefix `codex-office/0.138.0`. Capability parsing
accepts this exact product prefix alongside `Codex Desktop/`, while retaining
the exact version allowlist and rejecting repeated or mixed fingerprints.

`InitializeCapabilities` declares client capabilities (`experimentalApi`, `requestAttestation`, and optional notification opt-outs). It is not a complete server feature manifest. Method/field presence must therefore be validated against a pinned generated schema and at the parsing boundary.

### v0.1 capability mode

The first implemented adapter mode is partial `snapshot-polling` for exactly
Codex App Server 0.138.0. It requires the `initialize` and `thread/list`
request schemas. Discovery always sends `useStateDbOnly: true`, which prevents
the list operation from scanning JSONL rollouts to repair metadata.

The verified notification schemas are recorded separately, but their presence
does not prove delivery or an active subscription. State-database listing does
not expose cumulative token usage. The App Server has no standalone
`thread/subscribe` request; attaching with `thread/resume` can reconstruct
turns, while the data-minimizing `excludeTurns` option is experimental.
Therefore v0.1 capability negotiation keeps experimental API disabled and
reports only partial capability: `hierarchyPolling: true`, `usage: false`, and
`liveUpdates: false`.

Enabling usage or live attachment requires a separate accepted protocol/privacy decision and tests proving that session content is not unnecessarily ingested. Neither may be enabled as an implicit fallback.

### Codex 0.145.0 usage follow-up

A 2026-07-27 follow-up regenerated the stable TypeScript schema with Codex CLI
0.145.0 and compared it with the official
[`rust-v0.145.0`](https://github.com/openai/codex/tree/rust-v0.145.0) source.
The schema still exposes `thread/tokenUsage/updated`; each `total` and `last`
breakdown contains total, input, cached-input, cache-write-input, output, and
reasoning-output tokens. The stable ClientRequest union has no standalone
per-thread token-usage read or subscribe request, and `thread/read` does not
return cumulative usage.

The upstream [thread-scoped outgoing sender](https://github.com/openai/codex/blob/rust-v0.145.0/codex-rs/app-server/src/outgoing_message.rs)
delivers notifications only to the thread's subscribed connection IDs. The
[token usage replay path](https://github.com/openai/codex/blob/rust-v0.145.0/codex-rs/app-server/src/request_processors/token_usage_replay.rs)
likewise sends restored usage only to the connection that attached to the
thread. `thread/start`, `thread/fork`, and `thread/resume` attach the requesting
connection; they are not passive observation operations.

Therefore an independent metadata-only shared observer cannot safely obtain
the token summary printed by an exiting CLI session. Codex Office keeps
`usage: false` and will not parse terminal output or rollout files. This can be
revisited when an official content-free read or subscription method becomes
available without attaching to the thread.

## Sanitized evidence

[`tests/fixtures/codex/app-server-0.138.0-hierarchy-usage.json`](../../tests/fixtures/codex/app-server-0.138.0-hierarchy-usage.json) is a synthetic projection of the verified fields. It contains invented identifiers and counts, no user content, no rollout records, and no filesystem paths.

## Failure behavior

- Reject malformed or incompatible events at the provider boundary.
- Preserve the last safe timestamped snapshot and expose `degraded` or `disconnected` state.
- Never fall back to scanning real rollout content silently.
- Use `thread/list` only with `useStateDbOnly: true`; discard `cwd`, `preview`,
  `name`, `path`, Git metadata, turns, and other raw fields immediately at the
  provider boundary.
- Keep diagnostics local, content-free, and limited to protocol version, method, field, and validation error.

## Consequences and open questions

This evidence is sufficient to begin fixture and domain work, but not to claim protocol stability or that every launch path populates every hierarchy field. The adapter remains version-gated. The committed nested example proves the recursive consumer model, not a captured live root-child-grandchild sequence.

The following remain unconfirmed and require synthetic integration tests before production parsing:

- notification ordering across concurrently active parent and child threads;
- counter-reset behavior across compaction or server restart;
- whether every supported launch path populates `sessionId` consistently;
- whether future stable capability negotiation exposes a server feature manifest; and
- whether a stable content-minimizing live attachment method becomes available;
- whether cached parent context can ever be safely deduplicated across threads.
