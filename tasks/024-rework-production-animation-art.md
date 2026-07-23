# Task: Rework the complete production animation art

Status: Complete
Owner: Coordinator (Dex)
Governing contract: CDD-006
Depends on: Task 023

## Context

The stabilized 80 × 80 sprites remain too small and visually diverge from the
larger mascot direction selected by the maintainer. All nine status animations
need one consistent high-detail pixel-art identity and production-safe frames.

## Owned files

- `assets/office/source/`
- `assets/office/animation/`
- `assets/office/manifest.json`
- `scripts/build-office-animations.sh`
- Office visual styles, tests, contracts, attribution, and changelog

## Explicit non-goals

- Provider, protocol, domain, or usage changes.
- Agent steering or any other v0.x write capability.
- Telemetry, remote runtime assets, persistence, or network requests.
- Shared-room walking and handoff interactions.

## Acceptance criteria

- [x] All nine statuses use the same larger mascot identity and visual scale.
- [x] Each status provides five complete, equally sized production frames.
- [x] Frame three is a blink; remaining frames animate meaningful arms or props.
- [x] No overlapping limbs, duplicate bodies, clipping, jitter, matte, or chroma fringe.
- [x] Runtime artwork is truly transparent and crisp on light and dark themes.
- [x] Reduced motion, keyboard, and non-color status behavior remain unchanged.
- [x] Visual, package, accessibility, and full checks pass.
- [x] Independent review passes.

## Verification

- [x] Targeted tests
- [x] `pnpm check`
- [x] Privacy/security impact recorded
- [x] Handoff complete

## Privacy and security

All source and runtime images are local, content-free project assets. This task
adds no telemetry, provider data, filesystem path exposure, persistence,
runtime network request, or remote asset.

## Handoff

- Task / owner: Task 024 / Coordinator (Dex)
- Outcome: Reworked all nine status strips from the maintainer-selected larger
  mascot identity and generated 45 padded production frames. A follow-up
  normalized standing/furniture baselines, enlarged thinking and unknown, and
  removed the overlapping thinking arm while centering its ellipsis from the
  detected bubble geometry.
- Runtime contract: 128 × 128 frames, five frames per status, frame three blink,
  true alpha, and rendering at up to 192 CSS pixels.
- Verification: Focused visual tests passed; `pnpm check` passed 24 files /
  195 tests; VSIX passed at 23 files / 590.98 KB (605,161 bytes).
- Packaging: Nine compiled animation assets only; raw chroma and transparent
  generation sources remain excluded from the VSIX.
- Reproduction: Run `scripts/build-office-animations.sh`, `pnpm check`, and
  `pnpm package`; then run `pnpm dev`, press F5, and inspect all statuses with
  reduced motion both enabled and disabled.
