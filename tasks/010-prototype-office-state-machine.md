# Task: Prototype deterministic Office state machine

Status: Complete
Owner: Coordinator (Dex) with state-machine agent
Governing contract: CDD-006
Depends on: Issue #6

## Context

Issue #7 turns the accessible fixture hierarchy into a visual Office preview while keeping deterministic animation state separate from sanitized domain data.

## Owned files

- `src/webview/office-machine.ts` — State-machine agent
- `tests/webview/office-machine.test.ts` — State-machine agent
- `tests/webview/office-view.test.tsx` — Coordinator
- `src/webview/office-view.tsx` — Coordinator
- `src/webview/main.tsx` — Coordinator
- `src/webview/styles.css` — Coordinator
- `src/webview/agent-tree.tsx` — Coordinator
- `src/extension/view-provider.ts` — Coordinator
- `tasks/010-prototype-office-state-machine.md` — Coordinator
- `docs/cdd/CDD-006-OFFICE-UI.md` — Coordinator
- `CHANGELOG.md` — Coordinator

## Explicit non-goals

- Live provider integration, agent steering, or session controls.
- Pixel-art asset production or remote asset loading.
- Meter implementation from Issue #8.
- Storing session content in animation state.

## Acceptance criteria

- [x] Keep animation state separate from domain state.
- [x] Map every supported agent status deterministically.
- [x] Respect both VS Code and operating-system reduced-motion settings.
- [x] Document transitions and add state-machine tests.

## Verification

- [x] Targeted tests
- [x] `pnpm check`
- [x] Privacy/security impact recorded
- [x] Handoff complete

## Agent handoff

- Task / owner: Issue #7 / Coordinator (Dex) with state-machine and independent review agents.
- Outcome: Added a code-native Office diorama, exhaustive deterministic presentation state, live reduced-motion handling, repeatable crossfade transitions, and a retained accessible tree fallback.
- Files changed: See the owned-files list above.
- Contract decisions: Animation state contains only station, pose, accent, motion, phase, and reduced-motion state. Agent status is the sole domain input. Repeated states do not restart; each actual animated transition gets a new revision.
- Verification performed and result: State-machine and Office rendering tests pass; full `pnpm check` passes (9 files, 113 tests). Computer Use visual QA found and fixed the missing bundled stylesheet link and narrow-sidebar layout.
- Privacy/security impact: No session identity, task/content, path, provider payload, telemetry, network, persistence, or remote assets enter the animation layer.
- Known limitations: The v0.1 Office uses code-native shapes rather than a final pixel-art asset set. Browser-level transition timing and live configuration events do not yet have a dedicated integration harness.
- Follow-ups / dependencies: Issue #8 adds Meter; Issue #9 should exercise live configuration and browser transition behavior in the extension host.
- Exact reviewer reproduction steps: Run `pnpm test -- tests/webview/office-machine.test.ts tests/webview/office-view.test.tsx`, then `pnpm check`; launch with `pnpm dev` and `F5`, inspect Office at narrow width, and toggle `codexOffice.reducedMotion`.
