# Task: Unify account summary and Office

Status: Complete
Owner: Coordinator (Dex)
Governing contract: CDD-003, CDD-005, CDD-006
Depends on: Task 028

## Scope

Replace the Office/Meter mode switch with one compact sidebar containing local
account capacity, session counts, filters, and an equal-size agent grid.

## Owned files

- `src/webview/main.tsx`
- `src/webview/meter-view.tsx`
- `src/webview/office-view.tsx`
- `src/webview/styles.css`
- `src/protocol/webview.ts`
- `src/extension/view-provider.ts`
- related webview/protocol tests and product contracts

## Acceptance criteria

- No Office/Meter tabs or view-mode setting remain.
- Reported account capacity and root/subagent/thread counts appear above the
  agent floor.
- Account copy remains explicitly not billing or cost data.
- Every populated agent card uses the same footprint and character size.
- Root sessions have a subtle blue background plus a readable `Main` label.
- Compact layout remains keyboard navigable, reduced-motion aware, and usable
  at narrow sidebar widths and 200% zoom.
- No new dependency or provider field is introduced.
- `pnpm check` passes.

## Verification

- `pnpm check` passed: 24 test files, 202 tests.
- `git diff --check` passed.
- `pnpm package` produced `codex-office-0.0.1.vsix`.
- VSIX reinstall verified as `dejth.codex-office@0.0.1`.

## Handoff

- The sidebar now renders one compact account-and-agent view.
- Capacity remains labelled as reported and explicitly not billing data.
- Root and subagent cards share one footprint; roots retain a `Main` label and
  a subtle blue background as a redundant visual cue.
- No provider contract, network behavior, dependency, or Marketplace state
  changed.
