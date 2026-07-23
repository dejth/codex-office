# Asset Attribution

## Activity Bar icon

- Creator: Codex Office project
- Source: original project SVG; no external source
- License: repository MIT license
- File: `assets/activity-bar.svg`

## Office status character set

- Creator: Codex Office project using OpenAI image generation
- Generated: 2026-07-23
- Source: generated specifically for this repository; no third-party source
  asset was supplied as an input or reference
- Files: `assets/office/status/*.png`
- License: distributed as project assets under the repository MIT license
- Modifications: chroma-key removal, 3 × 3 atlas crop, transparent-background
  cleanup, and nearest-neighbor resize to 128 × 128
- Source files: `assets/office/source/codex-office-status-atlas-chroma.png` and
  `assets/office/status-atlas.png`

Production prompt:

> A 3 × 3 sprite atlas of the same cute tiny office robot, with the statuses
> thinking, reading, editing, running command, waiting approval, completed,
> failed, idle, and unknown in row-major order. Crisp 16-bit pixel art, amber,
> coral, teal, navy, and cream palette, chroma green background, no text,
> watermark, or shadows.

## Office animation sprites

- Creator: Codex Office project using OpenAI image generation
- Generated: 2026-07-23
- Input reference: the project-owned status atlas above
- Files: `assets/office/animation/*.png`
- License: distributed as project assets under the repository MIT license
- Modifications: green chroma-key removal with edge contraction and despill,
  shared per-status union crop, hot-pink eye-anchor registration, final
  128 × 128 safe-canvas composition, nearest-neighbor resize, and PNG
  compression
- Source files:
  `assets/office/source/rework-v2/*-chroma.png` and matching transparent
  `assets/office/source/rework-v2/*.png` strips

Production prompt:

> Create one strict five-frame horizontal action strip per Office status using
> the supplied larger Codex Office robot identity. Keep one full robot in each
> equal cell with the same baseline and scale. Frame three closes both eyes;
> the remaining frames use saturated hot-pink open eyes and clean
> status-specific hand or prop motion. Preserve the cream, navy, amber, coral,
> and teal high-detail pixel art on a removable flat green background. No
> checkerboard, watermark, shadows, clipping, duplicate body, overlapping
> limbs, or cross-cell content.

See `docs/design/OFFICE_VISUAL_SYSTEM.md` for the asset pipeline, conventions,
and deterministic manifest.
