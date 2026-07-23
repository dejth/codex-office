# Task: Implement Meter with provenance labels

Status: Complete
Owner: Coordinator (Dex) with usage agent
Governing contract: CDD-005, CDD-006
Depends on: Issues #2, #3, and #5

## Context

Issue #8 adds an information-dense Meter view that reports sanitized per-agent usage honestly, preserves provenance, and never implies billing or quota accuracy.

## Owned files

- `src/webview/usage-meter.ts` — Usage agent
- `tests/webview/usage-meter.test.ts` — Usage agent
- `src/webview/meter-view.tsx` — Coordinator
- `src/webview/main.tsx` — Coordinator
- `src/webview/styles.css` — Coordinator
- `src/protocol/preview-fixture.ts` — Coordinator
- `tests/webview/meter-view.test.tsx` — Coordinator
- `tests/webview/agent-tree.test.tsx` — Coordinator
- `docs/cdd/CDD-005-USAGE.md` — Coordinator
- `docs/cdd/CDD-006-OFFICE-UI.md` — Coordinator
- `CHANGELOG.md` — Coordinator
- `tasks/011-implement-meter-with-provenance.md` — Coordinator

## Explicit non-goals

- Billing, quota, credits, currency, or cost estimates.
- Inferring or removing replayed parent context without protocol evidence.
- Persisting usage history or raw session content.
- Production visual assets from Issue #19.

## Acceptance criteria

- [x] Display reported usage with explicit provenance.
- [x] Handle null, unknown, duplicate, replayed, and safe-integer boundary values honestly.
- [x] Never imply billing or quota accuracy.
- [x] Add accounting and UI tests for missing data and integer boundaries.

## Verification

- [x] Targeted tests
- [x] `pnpm check`
- [x] Privacy/security impact recorded
- [x] Handoff complete

## Agent handoff

- Task / owner: Issue #8 / Coordinator (Dex) with usage-model and independent review agents.
- Outcome: Added a responsive Meter with sanitized per-thread rows, component disclosures, explicit provenance, shared selection, and honest unavailable cross-thread totals.
- Files changed: See the owned-files list above.
- Contract decisions: Cumulative thread snapshots are never added across threads. Equal/replay-like parent-child values remain separate and carry an overlap caveat. Missing values remain `—`; unsafe integers fail closed.
- Verification performed and result: Usage and Meter tests pass; full `pnpm check` passes (11 files, 125 tests). Independent review reports no remaining findings.
- Privacy/security impact: Meter receives sanitized snapshot fields only and adds no persistence, network calls, telemetry, billing claims, session content, or paths.
- Known limitations: Cross-thread totals remain unavailable until protocol evidence proves disjoint scopes. Visual indentation is capped after level four while accessible names retain exact depth.
- Follow-ups / dependencies: Issue #19 replaces prototype Office visuals; Issue #9 validates Meter in a clean Extension Development Host.
- Exact reviewer reproduction steps: Run `pnpm test -- tests/webview/usage-meter.test.ts tests/webview/meter-view.test.tsx`, then `pnpm check`; launch with `pnpm dev` and `F5`, switch to Meter, and inspect disclosures at narrow width.
