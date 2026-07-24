# ADR-0004 — State-database spawn edges and account capacity

Status: Accepted

## Context

Codex Office 0.0.1 starts a separate local `codex app-server --stdio`
process. Its `thread/list` polling mode safely discovers workspace-scoped
metadata, but threads owned by another client are returned as `notLoaded`.
The private stdio App Server owned by the Codex desktop app does not expose a
shared socket that the extension can subscribe to.

A follow-up against Codex CLI 0.138.0 also confirmed the same isolation in VS
Code: the official Codex extension and Codex Office launch distinct App Server
processes over private stdio. Generated bindings expose
`thread/status/changed`, `thread/tokenUsage/updated`, and
`thread/unsubscribe`, but no content-minimizing cross-server status
subscription. `thread/resume` can rejoin a running thread in the target App
Server and is therefore an ownership/content boundary, not a passive observer
API. The official VS Code extension exposes no documented shared endpoint or
socket setting.

The previous adapter retained only `Thread.parentThreadId`. A sanitized live
probe on Codex CLI 0.138.0 found that state-database rows for subagents can
have `parentThreadId: null` while retaining the versioned structural source:

```text
source.subAgent.thread_spawn.parent_thread_id
source.subAgent.thread_spawn.depth
source.subAgent.thread_spawn.agent_nickname
source.subAgent.thread_spawn.agent_role
```

For the current workspace, the probe returned one root and nineteen
subagents. Every subagent had a resolvable structural source parent and a
bounded generated nickname. No prompt, preview, turn, command, path, raw
identifier, token value, or payload was recorded in this evidence.

The same exact-version schema exposes `account/rateLimits/read`. A sanitized
probe confirmed that the response provides primary and optional secondary
windows with `usedPercent`, `windowDurationMins`, and `resetsAt`. It also
contains account metadata, credits, names, and multi-bucket details that the
product does not need.

The current
[Codex App Server documentation](https://learn.chatgpt.com/docs/app-server.md)
describes App Server as the streamed interface for rich clients and warns that
the interface is for local development and can change. Generated TypeScript
and JSON Schema bindings remain the version-pinned source of field evidence.

## Decision

### Hierarchy

- Continue to prefer `Thread.parentThreadId` when it is present.
- For exactly Codex CLI 0.138.0 state-database polling, use
  `source.subAgent.thread_spawn.parent_thread_id` as a fallback when the
  canonical field is null.
- Accept the fallback only through a strict schema with bounded identifiers,
  depth, nickname, and role. Strip `agent_path` and every unknown field.
- Quarantine missing parents, cycles, duplicates, and invalid data through the
  existing hierarchy validator.
- Expose only a validated generated nickname as the optional display label.
  Thread preview, user title, raw name, task, role, and path remain host-only
  or discarded.
- Continue to label `notLoaded` threads as `unknown`. A two-second inventory
  refresh is not called a live lifecycle subscription.

### Account capacity

- Add `account/rateLimits/read` to the exact-version capability evidence.
- Read capacity at most once per minute while the visible view is connected.
- Retain only primary and secondary `usedPercent`, duration, and canonical
  reset timestamp. Discard limit IDs, limit names, plan type, credits,
  balances, spend controls, and raw response data.
- Label the result `reported account limits` and `not billing data`.
- Keep thread token usage, account token history, cost, credits, and billing
  out of scope. Account capacity and per-thread token usage are distinct.
- A malformed or unavailable capacity response does not degrade otherwise
  valid hierarchy data; the Meter renders capacity as unavailable.

### Live attachment

- Do not call `thread/resume` merely to observe another client's thread.
  A separate App Server can load or rejoin state and may broaden content
  ingestion or runtime ownership.
- Do not scan rollout JSONL or attach to a private desktop stdio process.
- True live lifecycle and per-thread token events remain unavailable until a
  shared, authenticated, content-minimizing connection is explicitly
  configured and separately accepted.
- Do not describe the presence of notification types in generated bindings as
  evidence that events from another App Server process can be observed.

## Consequences

The Office can reconstruct the real persisted root/subagent tree and show
generated agent nicknames without transcript access. The Meter can show
reported account-window percentages and reset timing. Neither feature implies
that another process's status or per-thread token usage is live.

The adapter remains gated to 0.138.0. A future Codex version must regenerate
schemas and rerun the boundary suite before these fields are accepted.

## Verification

```text
codex --version
codex app-server generate-ts --experimental --out <temporary-directory>
codex app-server generate-json-schema --experimental --out <temporary-directory>
```

The probe used `thread/list` with an exact workspace `cwd`,
`useStateDbOnly: true`, and the documented Codex/subagent source kinds. It
reported counts and structural key presence only. The account probe reported
field availability only; no actual percentage, reset time, identifier, plan,
credit, path, or token value was retained.
