# Task: Open the repository in Extension Host preview

Status: Complete
Owner: Coordinator (Dex)
Governing contract: CDD-004, CDD-007
Depends on: Task 019, Task 026

## Context

The isolated F5 profile loaded the repository, but extension activation could
run before VS Code published `workspaceFolders`. The provider captured that
temporary absence permanently, so Office and Meter remained unavailable even
after the folder finished opening.

## Owned files

- `.vscode/launch.json`
- `src/extension/extension.ts`
- `src/extension/view-provider.ts`
- `src/providers/codex/provider.ts`
- `tests/extension/activation.test.ts`
- `tests/providers/codex-provider.test.ts`
- `tests/release/launch-config.test.ts`
- Preview documentation and changelog
- `tasks/027-open-workspace-in-extension-preview.md`

## Explicit non-goals

- Global session discovery from an empty host.
- Enabling unrelated installed extensions.
- Changing provider, hierarchy, usage, or Meter semantics.

## Acceptance criteria

- [x] F5 loads the current extension build and opens the repository folder.
- [x] Provider discovery resolves the workspace when it connects, not only at
      extension activation.
- [x] The profile keeps unrelated installed extensions disabled.
- [x] Empty hosts outside this launch profile still require a workspace.
- [x] Launch behavior has deterministic regression coverage.

## Verification

- [x] Targeted tests
- [x] `pnpm check`
- [x] Privacy/security impact recorded
- [x] Handoff complete

## Review handoff

- Outcome: the F5 launch target passes the current repository through VS
  Code's explicit `--folder-uri` option while preserving extension isolation.
  Provider discovery resolves `workspaceFolders` lazily when the webview
  connects, avoiding the Extension Host startup race.
- Verification: launch/provider regression tests and `pnpm check` passed 24
  files / 202 tests.
- Privacy/security: discovery remains exact-workspace scoped. Empty hosts
  outside this explicit development launch still fail closed.
- Maintainer reproduction: close the previous empty Extension Development Host,
  press F5 again, and verify that the child window opens this repository before
  inspecting Office and Meter.
- Maintainer sign-off: completed after F5 and packaged-VSIX verification.
