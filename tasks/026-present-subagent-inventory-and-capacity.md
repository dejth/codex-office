# Task: Present subagent inventory and reported account capacity

Status: Complete
Owner: Coordinator (Dex)
Governing contract: CDD-003, CDD-005, CDD-006
Depends on: Task 025, Issue #42

## Context

The accepted Task 025 boundary can reconstruct persisted spawn edges and read
bounded account-capacity windows without transcript access. Office and Meter
need to expose that data honestly, accessibly, and without implying live
thread status, billing, or token totals.

## Owned files

- `src/domain/model.ts`
- `src/protocol/`
- `src/webview/`
- Corresponding domain, protocol, webview, accessibility, and visual tests
- `docs/cdd/CDD-006-OFFICE-UI.md`
- `CHANGELOG.md`
- `tasks/026-present-subagent-inventory-and-capacity.md`

## Explicit non-goals

- Live lifecycle or per-thread token attachment to another client.
- Account token history, credits, cost, billing, or spend controls.
- Reading or displaying thread titles, prompts, commands, paths, or turns.
- Agent steering, termination, prompt submission, or approvals.

## Acceptance criteria

- [x] Office preserves the recursive root/subagent layout and shows only
      bounded generated agent labels.
- [x] Meter prominently displays each reported account-capacity percentage and
      reset window.
- [x] Account capacity remains visually and semantically distinct from
      per-thread tokens.
- [x] Unknown and unavailable values remain explicit.
- [x] Narrow-width, keyboard, screen-reader, high-contrast, and reduced-motion
      behavior remain usable.
- [x] Provider and webview messages contain no sensitive source fields.

## Verification

- [x] Targeted tests
- [x] `pnpm check`
- [x] Privacy/security impact recorded
- [x] Handoff complete

## Review handoff

- Outcome: Main occupies the lead row while subagents render in a compact
  shared-room grid with generated nicknames and reduced-motion-safe arrival.
  Meter shows reported capacity percentage, duration, and reset time before
  keeping unavailable per-thread tokens separate.
- Automated verification: `pnpm check` passed 24 files / 201 tests. The live
  provider projection returned one Main, nineteen subagents, nineteen bounded
  labels, and an available primary capacity window.
- Privacy: no prompt, title, command, path, role, transcript, credit, balance,
  identifier, or raw provider payload crosses the webview boundary.
- Maintainer reproduction: run `pnpm dev`, press F5, keep this workspace open,
  then inspect Office and Meter. The final visual sign-off remains pending.
- Maintainer sign-off: completed through the packaged VSIX after account
  capacity, compact hierarchy, labels, and narrow-width presentation review.
