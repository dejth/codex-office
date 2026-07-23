# Task: Add deterministic Extension Host launch configuration

Status: Complete
Owner: Coordinator (Dex)
Governing contract: Repository development workflow
Depends on: Issue #27

## Context

The README instructed contributors to run `pnpm dev` and press F5, but the
repository did not define a launch configuration. VS Code therefore selected
an editor-specific or cached debug target, which could prompt for a Markdown
debugger or show a stale installed extension state.

## Owned files

- `.vscode/launch.json`
- `README.md`
- `tests/release/launch-config.test.ts`
- `CHANGELOG.md`
- `tasks/017-add-extension-host-launch.md`

## Acceptance criteria

- [x] F5 has an explicit Extension Host target.
- [x] The target loads this repository as the extension development path.
- [x] The launch contract has deterministic test coverage.
- [x] Verify the launch visually from a non-source active editor.
- [x] Run `pnpm check`.
- [x] Complete independent read-only review.

## Handoff

- Task / owner: Issue #29 / Coordinator (Dex)
- Outcome: F5 now launches the current Codex Office build even when a Markdown
  editor is active.
- Files changed: Launch configuration, contributor instructions, regression
  test, changelog, and this task record.
- Contract decisions: The repository owns the F5 target; active editor state
  must not decide what gets debugged.
- Verification performed and result: F5 launched **Run Codex Office
  Extension** from a Markdown editor without requesting a Markdown debugger.
  `pnpm check` passed 24 files / 187 tests. Independent review findings were
  resolved.
- Privacy/security impact: The launch target remains local and adds no
  telemetry, network call, persistence, provider data, or Marketplace action.
- Known limitations: Contributors must keep `pnpm dev` running for watch-mode
  rebuilds. The Extension Host starts without a workspace; open a folder there
  when verifying workspace-scoped discovery.
- Follow-ups / dependencies: None.
- Exact reviewer reproduction steps: Keep `pnpm dev` running, focus a Markdown
  file, press F5, and confirm the current Codex Office extension opens with this
  workspace.
