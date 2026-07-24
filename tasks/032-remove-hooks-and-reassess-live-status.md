# Task: Remove hooks and reassess zero-config live status

Status: Complete
Owner: Coordinator (Dex)
Governing contract: CDD-004, Task 029
Depends on: Maintainer rejection of the hooks UX

## Scope

Remove the proposed lifecycle-hook integration completely and reassess current
Codex interfaces for a user-transparent, read-only live-status path.

## Outcome

- Removed the receiver, bridge, sanitizer, hook config composer, commands,
  setting, tests, fixtures, tasks, and ADR associated with lifecycle hooks.
- Removed Codex Office hook proposal and receiver metadata from VS Code global
  storage.
- Removed the user-level experimental setting.
- Confirmed that `~/.codex/hooks.json` was never created.
- Packaged and reinstalled a VSIX with no hook bridge or hook configuration.
- Confirmed Codex CLI 0.138.0 supports an App Server Unix control socket and
  daemon tooling, but neither the official VS Code extension nor Codex Desktop
  uses the shared socket in the inspected runtime.
- Confirmed the installed official VS Code extension exposes no documented
  App Server endpoint setting or public extension API.

## Decision

Do not replace hooks with timestamps, rollout scanning, process heuristics, or
private extension inspection. Keep persisted hierarchy and account capacity
truthful, label unavailable lifecycle state as unreported, and track the
official shared-daemon/control-socket path as the preferred future integration.

## Verification

- `pnpm check`
- VSIX content inspection contains no hook bridge.
- Exact-path checks for user hooks, extension hook metadata, and the removed
  setting.
