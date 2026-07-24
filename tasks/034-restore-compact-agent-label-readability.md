# Task: Restore compact agent label readability

Status: Complete
Owner: Coordinator (Dex)
Governing contract: CDD-006
Depends on: Task 033

## Scope

Keep the equal-size compact agent grid while restoring readable agent names,
hierarchy labels, and reported statuses at practical sidebar widths.

## Owned files

- `src/webview/office-view.tsx`
- `src/webview/styles.css`
- related Office UI tests and visual contracts
- `docs/cdd/CDD-006-OFFICE-UI.md`
- `CHANGELOG.md`

## Acceptance criteria

- Cards reserve enough width for common agent names.
- Name and status no longer compete on the same line.
- Compact cards use concise `Main` and `Sub` hierarchy labels.
- The full station remains available in each accessible name.
- Root and subagent cards retain equal footprints and character sizes.
- Keyboard, reduced-motion, and non-color cues are unchanged.
- `pnpm check` passes.

## Verification

- `pnpm check` passed: 24 test files, 202 tests.
- `git diff --check` passed.
- Packaged and reinstalled `dejth.codex-office@0.0.1`.

## Handoff

- Common names receive at least 104 CSS pixels of card width.
- Agent name and reported status use separate caption lines.
- Visible hierarchy copy is reduced to `Main` and `Sub`; the full station
  remains in the button's accessible name.
- No provider, privacy, network, dependency, or Marketplace behavior changed.
