# Task: Compact the live agent room

Status: Complete
Owner: Dex
Governing contract: CDD-006
Depends on: Task 046

## Context

The shared observer now reports real basic status, but the room still uses
ambiguous filter labels and tall cards with repeated Unreported copy. Make live
work easier to scan while preserving complete hierarchy groups, keyboard
navigation, reduced motion, and honest status semantics.

## Owned files

- `src/webview/office-view.tsx`
- `src/webview/styles.css`
- `tests/webview/office-view.test.tsx`
- `docs/cdd/CDD-006-OFFICE-UI.md`
- `CHANGELOG.md`
- this task

## Explicit non-goals

- Changing provider status inference or protocol fields.
- Inferring task completion from `idle`.
- Hiding reported active, waiting, failed, idle, or completed sessions.

## Acceptance criteria

- [x] Filters use Working, Waiting, Failed, Idle, and Unreported semantics.
- [x] Large Unreported-only groups collapse behind an accessible summary.
- [x] Agent cards use less vertical space without reducing name readability.
- [x] Root/subagent context, status text, focus order, and reduced motion remain usable.
- [x] Relevant tests and contracts are updated.

## Verification

- [x] Targeted tests
- [x] `pnpm check`
- [x] Installed VSIX visual verification
- [x] Privacy/security impact recorded
- [x] Handoff complete

## Handoff

- Task / owner: Task 047 / Dex
- Outcome: The room now uses honest Working, Waiting, Failed, Idle, and
  Unreported filters; large Unreported-only groups collapse behind an
  accessible disclosure; cards use a denser consistent footprint.
- Files changed: Office webview, styles, focused tests, CDD-006, changelog, and
  this task.
- Contract decisions: Idle means no work is currently reported, never permanent
  task completion. Complete hierarchy groups remain intact across filters and
  the Other sessions disclosure.
- Verification performed and result: 17 focused UI tests passed, `pnpm check`
  passed with 220 tests, VSIX packaged and installed, and the maintainer
  approved the rendered sidebar.
- Privacy/security impact: None. The change only reorganizes the existing
  sanitized snapshot and adds no provider fields, storage, telemetry, or
  network behavior.
- Known limitations: Basic shared status cannot identify detailed tool actions
  or per-agent token usage.
- Follow-ups / dependencies: Release-readiness audit for the Marketplace beta.
- Exact reviewer reproduction steps: Install the VSIX, open a workspace with a
  shared observer, verify the filters, expand Other sessions, traverse cards by
  keyboard, and confirm reduced motion remains static.
