# Task: Fix root status filters

Status: Verified
Owner: Dex (coordinator)
Governing contract: CDD-006
Depends on: Issue #49, Task 040

## Context

The Office currently retains every root card regardless of the selected status
filter. A workspace containing only Unreported root sessions therefore still
shows every card when Active is selected.

## Owned files

- `src/webview/office-view.tsx`
- `src/webview/styles.css`
- `tests/webview/office-view.test.tsx`
- `docs/cdd/CDD-006-OFFICE-UI.md`
- `CHANGELOG.md`
- this task file

## Explicit non-goals

- Changing provider status or recency semantics.
- Flattening or discarding parent/subagent relationships.
- Inferring Unreported sessions as idle or active.

## Acceptance criteria

- [x] Root agents obey every status filter.
- [x] A nonmatching ancestor remains only when a descendant matches.
- [x] No matching agents renders an honest filtered empty state.
- [x] Keyboard focus uses only currently visible agents.

## Verification

- [x] Targeted tests: 14 passed
- [x] `pnpm check`: 24 files and 214 tests passed
- [x] Privacy/security impact recorded
- [x] Handoff complete

## Handoff

- Outcome: Status filters now apply to complete root groups, so an all-
  Unreported room correctly becomes empty under Active.
- Contract decisions: A group remains visible if its root or any descendant
  matches, preserving hierarchy context without bypassing root filtering.
- Verification: 14 focused tests and full `pnpm check` with 214 tests passed.
- Privacy/security impact: None. This is a pure sanitized-webview projection.
- Known limitations: Status accuracy still depends on what the provider reports.
- Follow-ups: Reinstall the VSIX and verify Active and Unreported against the
  current 22-root fallback inventory.
- Exact reviewer reproduction steps:
  1. Open a workspace whose sessions are all Unreported.
  2. Select Active and confirm `No active agents` replaces the cards.
  3. Select Unreported and confirm the cards return.
