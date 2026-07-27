# Task: Verify Shared App Server live status

Status: Verified
Owner: Coordinator (Dex)
Governing contract: CDD-004, CDD-005, CDD-006
Depends on: Issue #42, Task 029

## Scope

Verify and, only if the evidence supports it, implement an opt-in local Unix
socket adapter that observes lifecycle and usage events from an explicitly
shared Codex App Server.

## Owned files

- `docs/decisions/`
- `docs/cdd/CDD-004-CODEX-PROVIDER.md`
- `src/providers/codex/`
- provider fixtures and tests
- extension configuration required for explicit opt-in
- `tasks/036-verify-shared-app-server-live-status.md`

## Non-goals

- Attaching to private stdio owned by Codex VS Code or Desktop.
- Starting, steering, resuming, terminating, or prompting an agent.
- Reading or projecting prompts, turns, commands, paths, file contents, or raw
  event payloads.
- Scanning rollout JSONL or inferring activity from timestamps/processes.
- Enabling experimental transport by default.

## Acceptance criteria

- Pin the tested CLI version and generated schema evidence.
- Confirm the exact Unix socket transport and authentication boundary.
- Confirm whether an observer can receive thread, turn, item, approval, and
  token lifecycle events without taking thread ownership.
- Define strict content-minimizing event schemas and state mapping.
- Fail closed to the existing persisted inventory and `Unreported` status.
- Record privacy, security, compatibility, reconnection, and replay behavior
  in an accepted ADR before production enablement.
- Add fixture-backed regression coverage for every accepted event.
- `pnpm check` passes.

## Evidence summary

- Codex CLI tested: `0.138.0`.
- Default managed endpoint: owner-only Unix socket using WebSocket framing.
- An independent observer can use `thread/loaded/list` and metadata-only
  `thread/read` without resuming the thread.
- Basic active, approval-waiting, idle, and failed states are available.
- Editing, command/tool activity, and per-thread usage are not available under
  the accepted content-minimizing observer contract.
- Decision and safety boundary: ADR-0005.

## Handoff

- Outcome: Added a disabled-by-default, metadata-only Shared App Server status
  overlay for workspace-scoped persisted threads.
- Files changed: provider transport and adapter, extension configuration,
  provider/transport/activation tests, ADR-0005, CDD-004, changelog, package
  metadata, build budget, and this task.
- Contract decisions: local default Unix socket only; current-user ownership
  and `0600` permissions required; no remote endpoint; no resume, prompt,
  steering, turn/item subscription, or content projection.
- Verification: `pnpm check` passed with 208 tests; VSIX packaging and package
  budget passed at 619,871 bytes.
- Privacy/security impact: strict intersection with workspace inventory and
  strict identifier/status parsing; notifications and unknown fields are
  discarded.
- Known limitations: exact CLI 0.138.0 only; basic status only; no per-thread
  tokens or editing/command distinction; setting requires reload.
- Reviewer reproduction:
  1. Start the managed App Server daemon.
  2. Enable `codexOffice.experimentalSharedAppServer`.
  3. Reload VS Code and connect a Codex client to the shared daemon from the
     same workspace.
  4. Confirm loaded active/waiting/idle states update while unrelated workspace
     identifiers and response content never reach the webview.
