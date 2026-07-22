# Testing Strategy

## Test pyramid

- Pure unit tests: hierarchy, status mapping, accounting, validation.
- Contract tests: sanitized provider fixtures and webview messages.
- Integration tests: extension lifecycle and storage with VS Code test runner.
- UI tests: component state, keyboard flow, accessibility, responsive layouts.
- Smoke tests: package/install VSIX in a clean VS Code profile.
- Manual exploratory: live supported Codex versions without recording private content.

## Release matrix

Test latest stable VS Code plus minimum supported version on macOS, Linux, and Windows in CI where practical. Provider integration must document tested Codex versions.

## Golden rules

No real user rollouts in the repository. Fixtures are synthetic and reviewed for secrets. Flaky visual/timing tests block release until repaired or explicitly quarantined with an issue and owner.
