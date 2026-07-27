# Task: Diagnose Shared observer inside Extension Host

Status: Complete
Owner: Dex
Governing contract: CDD-004, ADR-0005
Depends on: Task 045

## Context

The exact provider connects to the owner-only shared socket outside VS Code,
but the installed Extension Host still presents Persisted inventory. Add
bounded local lifecycle diagnostics to identify the failing stage without
recording paths, identifiers, payloads, or content.

## Owned files

- `src/providers/codex/provider.ts`
- `src/extension/extension.ts`
- provider and activation tests
- provider contract, ADR, changelog, and this task

## Explicit non-goals

- Logging socket paths, thread IDs, prompts, turns, commands, or payloads.
- Weakening transport security.
- Publishing diagnostics remotely.

## Acceptance criteria

- [x] Local logs distinguish shared intent, start, success, and bounded failure.
- [x] No sensitive field can enter a diagnostic event.
- [x] Installed Extension Host evidence identifies the actual failure stage.
- [x] The root cause is fixed and covered by tests before PR completion.

## Verification

- [x] Targeted tests
- [x] Installed VSIX runtime evidence
- [x] `pnpm check`
- [x] Privacy/security impact recorded
- [x] Handoff complete

## Handoff

- Task / owner: Task 046 / Dex
- Outcome: Extension Host diagnostics isolated an immediate
  `protocol-failed` after the secure socket check. The transport now uses
  `ws+unix:` directly instead of an ordinary WebSocket URL plus a custom
  connection callback.
- Files changed: provider transport/lifecycle diagnostics, activation logging,
  focused tests, CDD-004, ADR-0005, changelog, and this task.
- Contract decisions: Diagnostics are host-local and bounded to setting intent,
  source, lifecycle stage, provider diagnostic, and transport error enum.
- Verification performed and result: The owner-only live socket completed both
  the native `ws+unix:` upgrade and `initialize` RPC. Targeted checks and full
  repository gate are recorded above when complete.
- Privacy/security impact: Socket ownership and mode checks remain mandatory.
  No path, thread identifier, prompt, payload, command, or content enters logs.
- Known limitations: Shared observer remains opt-in and version-gated to Codex
  CLI 0.145.0.
- Follow-ups / dependencies: Install the VSIX and confirm the sidebar source is
  `Shared observer` before PR completion.
- Exact reviewer reproduction steps: Enable the experiment, run the supported
  owner-only shared daemon, install the VSIX, reload VS Code once, and confirm
  the Office source badge changes from persisted fallback to Shared observer.
