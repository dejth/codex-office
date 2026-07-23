# Task: Stabilize mascot animation anchors and eye color

Status: Complete
Owner: Coordinator (Dex)
Governing contract: CDD-006
Depends on: Issue #40

## Context

The five generated frames were trimmed independently, so changes in props
altered the body position. Green chroma removal also removed the original eye
detail. Production sprites need fixed body registration and a source palette
that separates the key color from the eyes.

## Owned files

- `assets/office/animation/`
- `assets/office/source/stable-five-frame-*.png`
- `assets/office/manifest.json`
- `scripts/build-office-animations.sh`
- visual tests, contracts, design docs, attribution, and changelog

## Explicit non-goals

- Provider or domain changes.
- Remote assets, telemetry, persistence, or runtime network requests.
- Animation when reduced motion is enabled.

## Acceptance criteria

- [x] Every status applies one shared crop to all five frames.
- [x] The body remains invariant while masked arms, props, and eyes animate.
- [x] Open-eye frames preserve visible hot-pink eyes.
- [x] Frame three remains the blink.
- [x] Every frame uses a padded 80 × 80 canvas with complete status props.
- [x] Runtime rendering remains crisp at up to 160 CSS pixels.
- [x] Visual, package, accessibility, and full checks pass.
- [x] Independent review passes.

## Verification

- [x] Targeted tests
- [x] `pnpm check`
- [x] Privacy/security impact recorded
- [x] Handoff complete

## Privacy and security

All source and runtime images remain local, content-free project assets. This
task adds no telemetry, provider data, path exposure, persistence, remote
assets, or runtime network request.

## Handoff

- Task / owner: Issue #40 / Coordinator (Dex)
- Outcome: Rebuilt all 45 animation frames from green sources with hot-pink
  eyes, reused one invariant body pose per status, and composited only masked
  arms, props, and blink pixels from the action frames. Expanded the safe
  canvas to 80 × 80, centered each complete layered union, and repaired the
  unknown-state question bubble across all five frames.
- Files changed: Production/source sprites, manifest, reproducible build script,
  RGBA visual tests, contracts, design docs, attribution, changelog, and task.
- Contract decisions: Frames render at up to 160 CSS pixels from an 80 × 80
  nearest-neighbor source. Frame three remains the blink; open frames retain
  hot-pink eyes; all pixels outside the eye and status motion masks remain
  identical to frame one, and protected head/body/feet regions remain invariant
  independently of those masks.
- Verification performed and result: Focused visual tests passed; `pnpm check`
  passed 24 files / 195 tests; fresh VSIX passed at 23 files / 212.22 KB
  (217,317 bytes);
  independent review inspected all 45 frames and approved.
- Privacy/security impact: Local, content-free assets only. No telemetry,
  provider data, paths, persistence, remote asset, or runtime network request.
- Known limitations: The source atlas remains generated pixel art; the
  deterministic registration and RGBA guards prevent cell spacing and chroma
  removal from reintroducing the reported defects.
- Follow-ups / dependencies: New animation sources must use green chroma,
  hot-pink eyes, and the shared-crop/face-anchor build pipeline. A separate
  shared-room task should place multiple agents on one floor and animate
  deterministic walking/handoff routes without adding steering.
- Exact reviewer reproduction steps: Run
  `scripts/build-office-animations.sh`, then `pnpm check` and `pnpm package`;
  run `pnpm dev`, press F5, and inspect all statuses with reduced motion off.
