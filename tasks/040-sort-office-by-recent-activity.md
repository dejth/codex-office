# Task: Sort the Office by reported recent activity

Status: Verified
Owner: Dex (coordinator)
Governing contract: CDD-002, CDD-003, CDD-004, CDD-006
Depends on: Issue #47, Task 039

## Context

The Office currently inherits deterministic hierarchy order based on thread
creation time. Codex App Server 0.145.0 also reports `updatedAt`, which can
support an honest recent-activity order without reading session content.

## Owned files

- `src/domain/model.ts`
- `src/domain/hierarchy.ts`
- `src/providers/codex/provider.ts`
- `src/protocol/`
- `src/webview/office-view.tsx`
- corresponding tests and synthetic fixtures
- CDD, ADR, changelog, and this task file

## Explicit non-goals

- Inferring activity from prompts, turns, filesystem changes, or process state.
- Changing provider connection, polling, or read-only behavior.
- Flattening parent/subagent relationships into an unrelated global list.

## Acceptance criteria

- [x] Active agents sort before non-active agents in the Office.
- [x] Agents in the same activity class sort by reported `updatedAt`, newest first.
- [x] Parent/subagent grouping remains intact and deterministic.
- [x] Missing or invalid activity timestamps remain explicit and sort last.
- [x] No content-bearing provider fields cross the webview boundary.

## Verification

- [x] Targeted tests: 82 passed
- [x] `pnpm check`: 24 files and 212 tests passed
- [x] Privacy/security impact recorded in ADR-0006
- [x] Handoff complete

## Handoff

- Outcome: The Office now ranks active agent groups first and newest reported
  activity first within each class while preserving parent/subagent grouping.
- Contract decisions: Codex 0.145.0 `updatedAt` crosses the boundary only as a
  nullable canonical timestamp through webview protocol v2.
- Verification: 82 focused tests and full `pnpm check` with 212 tests passed.
- Privacy/security impact: One content-free timestamp is retained. No session
  content, path, network call, telemetry, persistence, or steering was added.
- Known limitations: `Unreported` persisted sessions remain last because a
  timestamp alone does not prove current activity.
- Follow-ups: Verify visual order in an installed VSIX with both live shared
  status and private fallback inventory.
- Exact reviewer reproduction steps:
  1. Install the built VSIX and open a workspace with multiple Codex sessions.
  2. Confirm active groups appear before idle, completed, and Unreported groups.
  3. Update two agents in the same class and confirm the newest appears first.
  4. Confirm parents remain immediately before their subagents.
