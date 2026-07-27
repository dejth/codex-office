# ADR-0005 — Opt-in shared App Server status observation

Status: Accepted

## Context

The existing Codex Office provider starts a private
`codex app-server --stdio` process and reads workspace-scoped persisted
metadata. That process cannot observe the lifecycle state owned by another
Codex client, so persisted sessions conservatively appear as `Unreported`.

Codex CLI 0.145.0 provides a managed App Server daemon whose default local
control endpoint is:

```text
$CODEX_HOME/app-server-control/app-server-control.sock
```

The endpoint uses WebSocket framing over a Unix socket. A sanitized local probe
confirmed that an independently initialized observer can call
`thread/loaded/list` and then `thread/read` with `includeTurns: false` for a
loaded thread without calling `thread/resume`, submitting a turn, or receiving
prompt content. The returned thread status is sufficient for a bounded
lifecycle overlay.

The transport is explicitly experimental in the upstream App Server
documentation. Its schema and behavior may change, and it is not suitable as a
default production dependency.

## Decision

- Add an experimental setting,
  `codexOffice.experimentalSharedAppServer`, defaulting to `false`.
- When enabled, use only the default local Unix control socket. Never accept a
  remote URL, TCP endpoint, user-supplied socket path, or network fallback.
- Connect only when the endpoint is a real socket owned by the current user and
  has no group or other permissions. Otherwise fall back to the existing
  private stdio provider.
- Treat the setting as connection intent and perform the ownership/permission
  check once, inside the Unix transport at connection time. Do not use a
  duplicate activation-time preflight that can incorrectly select stdio before
  the secure transport has attempted the endpoint.
- The extension does not start, stop, restart, or configure the daemon.
- If the shared transport cannot initialize or complete its first bounded
  metadata poll, retry through the existing private stdio snapshot provider.
  Fallback inventory remains `Unreported`; it is never presented as live
  shared status.
- While the experiment remains enabled, retry recovery from a connected
  fallback with a ten-second minimum cooldown. Preserve the last safe snapshot
  during the transition and reconnect private inventory after a failed retry.
  Do not expose the failed shared probe as a transient degraded UI state when
  fallback recovery succeeds; publish degradation only when both sources fail.
- Project a bounded source enum so the UI distinguishes a connected shared
  observer from persisted inventory. Do not expose socket or executable
  details.
- Preserve the persisted, exact-workspace state-database inventory as the
  authoritative hierarchy. Use `thread/loaded/list`, intersect the identifiers
  with that bounded inventory, and call `thread/read` with
  `includeTurns: false` only for those identifiers.
- Validate the response through a strict schema retaining only thread
  identifier and status. Discard notifications and all unknown response fields
  at the transport/provider boundary.
- Declare the pinned schema's content-bearing turn, item, command-output,
  file-change, reasoning, and realtime notification methods in
  `optOutNotificationMethods`. The observer polls bounded metadata and has no
  reason to receive those payloads.
- Never call `thread/start`, `thread/resume`, `thread/fork`, `turn/start`, or
  any agent-control method from the observer.
- Map only confirmed basic states:
  - active without a waiting flag → `thinking`
  - active waiting for approval → `waiting-approval`
  - idle → `idle`
  - system error → `failed`
  - missing, malformed, unloaded, or incompatible → `Unreported`
- Do not infer editing, command execution, or tool-specific activity. Those
  details require subscription-scoped turn/item events and are outside this
  observer contract.
- Do not claim per-thread token usage. The accepted observer flow does not
  provide it. Codex 0.145.0 routes usage notifications and replay only to
  connections subscribed or attached to the thread; the observer must not
  attach merely to obtain usage.

## Consequences

Users who explicitly opt in and run the shared daemon can see honest basic live
status for workspace threads loaded into that daemon. Existing users retain
the private stdio inventory behavior.

The observer remains local, read-only, content-minimizing, and fail-closed. A
socket or overlay failure leaves persisted hierarchy available with
`Unreported` status rather than degrading it into guessed activity.

Suppressing content-bearing notifications also prevents unrelated active Codex
clients from delivering prompt, response, command-output, file-change, or
reasoning payloads to the observer. The existing bounded transport limit is not
increased.

Because the WebSocket transport is experimental, exact Codex CLI 0.145.0
remains the only accepted version. A version change requires regenerated schema
evidence and regression verification before the capability can be widened.

## Verification evidence

The investigation used temporary generated schemas and temporary probe
dependencies outside the repository. It did not retain prompts, transcripts,
commands, file contents, paths, raw payloads, account identifiers, or token
values.

The local endpoint was first verified on 0.138.0 as an owner-only Unix socket
(`0600`). A metadata-only two-connection probe confirmed:

- a second connection can list identifiers currently loaded by the daemon;
- `thread/read` with `includeTurns: false` returns the current basic status;
- no resume or subscription is required for that read;
- thread/turn/item notifications remain connection/subscription scoped and are
  not used by this decision.

The installed Extension Host verification on 2026-07-27 corrected an earlier
transport conclusion. Passing an explicit Unix-domain `createConnection`
through ordinary WebSocket options worked in a standalone probe but failed in
the Extension Host because `ws` normalizes client options and can replace the
intended endpoint with `localhost`. The native
`ws+unix:///owner-only/socket:/rpc` address succeeds for both the WebSocket
upgrade and `initialize` RPC against Codex CLI 0.145.0. A regression test pins
this connection shape. Bounded host-local lifecycle diagnostics exposed only
source, stage, provider diagnostic, and transport error code while confirming
the failure; no endpoint path or session data was logged.

On 2026-07-27, a repeated content-free probe confirmed that the secured 0.145.0
daemon was healthy while `thread/loaded/list` returned zero identifiers. This
explains an all-Unreported workspace inventory without treating it as a shared
transport failure: existing VS Code sessions were owned by separate private
App Server processes rather than the shared daemon.
