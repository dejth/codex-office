# Task: Isolate Extension Host preview

Status: Complete
Owner: Coordinator (Dex)
Governing contract: CDD-004, CDD-006
Depends on: Issue #32

## Context

An empty Extension Development Host requested every persisted Codex session
with `cwd: null`, which made historical sessions look like hundreds of current
agents. Installed third-party extensions also polluted the shared Debug Console.

## Owned files

- `.vscode/launch.json`
- `src/providers/codex/provider.ts`
- `src/extension/extension.ts`
- `src/extension/view-provider.ts`
- `src/protocol/webview.ts`
- `src/webview/connection-notice.tsx`
- relevant tests and documentation

## Explicit non-goals

- Deleting or mutating persisted Codex sessions.
- Filtering or suppressing output from extensions outside the debug profile.
- Changing workspace-scoped provider discovery.

## Acceptance criteria

- [x] Empty hosts do not start App Server or request global sessions.
- [x] The webview explains that a workspace folder is required.
- [x] The debug profile disables unrelated installed extensions.
- [x] Targeted and full checks pass.
- [x] Independent review passes.

## Verification

- [x] Targeted tests
- [x] `pnpm check`
- [x] Privacy/security impact recorded
- [x] Handoff complete

## Handoff

- Task / owner: Issue #32 / Coordinator (Dex)
- Outcome: Empty hosts no longer query or render global persisted sessions, and
  the F5 profile excludes unrelated installed extensions.
- Files changed: Provider scope gate, extension activation, bounded protocol
  reason, notice copy, launch profile, tests, contracts, README, and changelog.
- Contract decisions: Production discovery is workspace-required; no workspace
  is an explicit disconnected state rather than global discovery.
- Verification performed and result: Targeted tests passed 6 files / 60 tests;
  `pnpm check` passed 24 files / 191 tests; independent review approved.
- Privacy/security impact: The change reduces data access by returning before
  App Server startup or `thread/list` when no workspace exists. No telemetry,
  persistence, path projection, or network call was added.
- Known limitations: Opening a folder reloads the Development Host before
  workspace-scoped discovery begins.
- Follow-ups / dependencies: Issue #33 adds frame-based pixel animation.
- Exact reviewer reproduction steps: Run `pnpm dev`, press F5 with no folder
  open in the host, and confirm workspace guidance appears with no global agent
  cards or unrelated installed-extension console output.
