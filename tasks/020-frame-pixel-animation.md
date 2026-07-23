# Task: Add frame-based pixel animation

Status: Complete
Owner: Coordinator (Dex)
Governing contract: CDD-006
Depends on: Issue #33

## Context

The Office used static status PNGs and moved the entire bitmap with CSS. The
product contract calls for animated pixel art whose actions remain accessible
and deterministic.

## Owned files

- `assets/office/animation/`
- `assets/office/source/codex-office-animation-atlas*.png`
- `assets/office/manifest.json`
- `assets/ATTRIBUTION.md`
- `src/webview/office-machine.ts`
- `src/webview/styles.css`
- relevant tests and animation documentation
- `esbuild.mjs`
- `.vscodeignore`
- `scripts/check-budgets.mjs`
- `tests/release/package-contents.test.ts`

## Explicit non-goals

- Provider or domain-state changes.
- Canvas, video, GIF, remote assets, or runtime network requests.
- Animation that overrides reduced-motion preferences.

## Acceptance criteria

- [x] Every supported status has two genuine action frames.
- [x] Runtime motion advances sprite frames instead of moving one bitmap.
- [x] Reduced motion pins a static frame.
- [x] Assets have deterministic hashes, dimensions, provenance, and budgets.
- [x] Visual and automated verification pass.
- [x] Independent review passes.

## Verification

- [x] Targeted tests
- [x] `pnpm check`
- [x] Privacy/security impact recorded
- [x] Handoff complete

## Handoff

- Task / owner: Issue #33 / Coordinator (Dex)
- Outcome: Every Office status now uses a genuine two-frame pixel-art action
  sprite instead of whole-bitmap transform animation.
- Files changed: Animation assets and sources, manifest, attribution, Office
  state/CSS, build/package isolation, tests, contracts, and changelog.
- Contract decisions: Runtime motion changes sprite background position only;
  reduced motion pins frame one; raw/generated assets never enter the VSIX.
- Verification performed and result: Visual QA passed all nine sprite pairs;
  `pnpm check` passed 24 files / 193 tests; a fresh VSIX passed package policy
  at 23 files / 186,973 bytes; independent review approved.
- Privacy/security impact: Assets are local and content-free. No provider data,
  filesystem paths, telemetry, remote persistence, or runtime network request
  was added.
- Known limitations: Two-frame loops intentionally favor clarity and package
  size over high-frame-count character animation.
- Follow-ups / dependencies: Future statuses require matching sprite,
  presentation-state, manifest, accessibility, and reduced-motion updates.
- Exact reviewer reproduction steps: Run `pnpm dev`, press F5, open a workspace
  with Codex sessions, verify action frames advance in Office, then enable
  `codexOffice.reducedMotion` and confirm every character remains on frame one.
