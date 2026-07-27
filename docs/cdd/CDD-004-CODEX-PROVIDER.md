# CDD-004 — Codex Provider Contract

Status: Verified metadata, account-capacity polling, and opt-in shared status
for Codex CLI 0.145.0

Evidence baseline: [ADR-0003](../decisions/ADR-0003-CODEX-APP-SERVER-EVIDENCE.md)
and [ADR-0004](../decisions/ADR-0004-STATE-DB-SPAWN-AND-ACCOUNT-CAPACITY.md).
The opt-in shared status overlay is governed by
[ADR-0005](../decisions/ADR-0005-OPT-IN-SHARED-APP-SERVER-STATUS.md).

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

- Support is an exact allowlist for `0.145.0`; every other version degrades
  until its generated schema and contract suite pass.
- Runtime fingerprints are accepted only with the verified `Codex Desktop/`
  or Extension Host `codex-office/` prefix. Repeated, mixed, malformed, and
  other prefixes degrade without exposing the raw fingerprint.
- The implemented mode is partial `snapshot-polling` using `initialize`,
  `thread/list` with `useStateDbOnly: true`, and the bounded
  `account/rateLimits/read` projection.
- Required notification names are pinned schema evidence, not proof of observation or subscription.
- The capability result reports `hierarchyPolling: true`,
  `accountRateLimits: true`, `usage: false`, and `liveUpdates: false`; it never
  describes the overall adapter as fully supported.
- Experimental API remains disabled. A privacy-reviewed usage/live attachment contract is required before those capabilities can be enabled.
- Capability diagnostics are bounded and content-free. Raw fingerprints, `codexHome`, paths, prompts, and server payloads are never retained.

## Failure behavior

Provider failure never crashes VS Code. UI shows disconnected/degraded, preserves the last timestamped snapshot when safe, and gives a local troubleshooting path.

## v0.1 integration boundary

The extension owns a local `codex app-server --stdio` child process. It
initializes without experimental APIs and polls persisted metadata through
`thread/list` with `useStateDbOnly: true`, using an exact workspace-directory
filter when VS Code has an open workspace. Discovery explicitly includes CLI,
VS Code, exec, App Server, and every documented subagent source kind; relying
on the upstream default would silently exclude subagents. Strict boundary
schemas retain only hierarchy identity, timestamp, and status; previews, names,
turns, paths, Git metadata, and raw provider payloads are discarded.

State-database subagent rows on the pinned version can omit canonical
`parentThreadId` while retaining
`source.subAgent.thread_spawn.parent_thread_id`. The adapter accepts that
versioned structural fallback through a strict schema, strips `agent_path` and
role, and exposes only a bounded generated agent nickname. Missing or invalid
parents remain unresolved rather than being promoted to roots.

Persisted sessions owned by another process are reported as `notLoaded` and map
to the conservative `unknown` state. The extension cannot attach to a separate
Codex stdio process, so it never presents those states as live. Cross-process
attachment, private IPC, rollout scanning, and content-bearing resume remain
out of scope without an accepted privacy ADR. An empty state-database result is
authoritative, not an error.

Generated notification schemas do not change this boundary. Lifecycle and
token notifications are scoped to the owning App Server transport. The
official VS Code Codex extension and Codex Office currently launch separate
private-stdio App Server processes, and the official extension exposes no
documented shared endpoint configuration. Until an official read-only
cross-client subscription exists, provider-backed Office status remains
inventory provenance rather than live lifecycle state.

An explicitly enabled experimental mode may instead connect to the default
owner-only managed App Server Unix socket on Codex CLI 0.145.0. It preserves
the state-database hierarchy, intersects `thread/loaded/list` identifiers with
the already workspace-bounded inventory, and reads only strict identifier and
status metadata through `thread/read` with `includeTurns: false`. It never
starts, resumes, forks, prompts, or controls a thread; it discards
notifications and unknown fields. Initialization explicitly opts out of
content-bearing turn, item, command-output, file-change, reasoning, and
realtime notifications; live state continues to come from bounded metadata
polling. Missing, malformed, incompatible, or unloaded states remain
`Unreported`. The mode is disabled by default and cannot be configured with a
remote endpoint or arbitrary socket path.

Root classification also remains evidence-based. A sanitized 0.145.0 probe
found 21 workspace-scoped `vscode` sessions with no canonical or spawn-source
parent field. They are separate root sessions, not nineteen or twenty inferred
subagents. The UI labels these cards `Root`; only verified parent edges receive
the `Sub` label.

The production extension requires an open workspace before connecting. With no
workspace it does not start App Server or request global persisted sessions;
the webview receives only the bounded `workspace-required` diagnostic.

The transport resolves the executable without a shell from bounded user-local
installation locations, the extension-host PATH, and platform application
locations, including the macOS ChatGPT application bundle. User-local
locations take precedence because a GUI host can inject a bundled pre-release
binary ahead of the maintainer-selected CLI. Resolution and transport failures
expose only bounded content-free codes; executable paths are never projected
or logged.
