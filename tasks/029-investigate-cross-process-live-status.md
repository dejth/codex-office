# Task: Investigate cross-process live Codex status

Status: Complete — no safe production attachment available
Owner: Coordinator (Dex)
Governing contract: CDD-004, ADR-0004
Depends on: Task 025, Task 026

## Question

Can Codex Office observe truthful live lifecycle changes for threads currently
owned by the official VS Code Codex extension or Codex Desktop without reading
conversation content, taking runtime ownership, or modifying those clients?

## Evidence

- The current official Codex manual documents App Server notifications such as
  `thread/status/changed`, `turn/started`, `item/started`, and
  `turn/completed` as streamed events on an active App Server transport.
- TypeScript bindings generated from local Codex CLI 0.138.0 confirm
  `ThreadStatusChangedNotification`, `ThreadTokenUsageUpdatedNotification`,
  and `ThreadUnsubscribeParams`.
- Generated `ThreadResumeParams` states that a running thread is rejoined by
  `threadId`; this is runtime ownership/subscription behavior, not a
  content-free observer method.
- A sanitized process-topology check found separate App Server processes for
  the official Codex client and Codex Office. Each was launched over private
  stdio by its owning Extension Host/application.
- The installed official VS Code extension contributes a development-only CLI
  executable override but no documented App Server endpoint, socket, or
  notification API setting.
- The current public protocol exposes no content-minimizing
  `thread/subscribe-status` request for a thread owned by another App Server.
- Codex CLI 0.138.0 now exposes `app-server --listen unix://`,
  `app-server daemon`, `app-server proxy`, and `thread/loaded/list`, but the
  inspected official VS Code and desktop clients still launch private default
  App Server processes. No control socket was present at the documented
  `$CODEX_HOME/app-server-control/app-server-control.sock` location.

## Decision

Do not implement a fake live adapter. In particular:

- Do not infer lifecycle from timestamps, file changes, process activity, or
  state-database freshness.
- Do not call `thread/resume` merely to observe another client's thread.
- Do not intercept another process's stdio or inspect rollout JSONL.
- Do not claim `thread/list` inventory polling is live lifecycle data.

## Outcome

Truthful live status for the official VS Code Codex session is blocked by
cross-process event isolation in the current integration topology. Codex
Office can continue to show workspace-scoped persisted inventory, hierarchy,
generated nicknames, and reported account capacity.

## Safe future paths

1. An official read-only status subscription or shared authenticated event
   endpoint exposed by the owning Codex client.
2. An explicit shared App Server deployment where every participating client
   connects to the same managed daemon. This requires a separate ADR, opt-in
   configuration, and compatibility evidence; the official VS Code extension
   currently exposes no documented setting for it.
3. Threads created and owned by Codex Office itself. This conflicts with the
   v0.x read-only product boundary and is not proposed.

## Verification

- Current Codex manual fetched through the official manual helper.
- `codex --version`: `codex-cli 0.138.0`.
- `codex app-server generate-ts` inspected only in a temporary directory.
- Process arguments were inspected locally and no prompts, transcripts,
  paths, identifiers, payloads, or token values were recorded.
