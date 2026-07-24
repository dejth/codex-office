# Task: Label unreported agent status

Status: Complete
Owner: Coordinator (Dex)
Governing contract: CDD-006
Depends on: Task 034

## Scope

Present the internal `unknown` status as `Unreported` wherever users or
assistive technology encounter it.

## Owned files

- `src/webview/office-view.tsx`
- `src/webview/agent-tree.tsx`
- related webview tests
- `docs/cdd/CDD-006-OFFICE-UI.md`
- `CHANGELOG.md`

## Acceptance criteria

- Agent cards display `Unreported` when no detailed provider status exists.
- Accessible status labels use the same wording.
- Internal provider/domain status remains `unknown`.
- `pnpm check` passes.

## Verification

- `pnpm check` passed: 24 test files, 202 tests.
- `git diff --check` passed.
- Packaged and reinstalled `dejth.codex-office@0.0.1`.

## Handoff

- User-facing and accessible status copy now says `Unreported`.
- The internal `unknown` status, provider contract, animation asset, and
  filtering behavior remain unchanged.
