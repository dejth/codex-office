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
- Modifications: chroma-key removal, deterministic five-frame crop,
  transparent trimming, nearest-neighbor resize, and PNG compression
- Source files:
  `assets/office/source/five-frame-*-chroma.png` and matching transparent
  `assets/office/source/five-frame-*.png` atlases

Production prompt:

> Create three strict 5 × 3 animation atlases using the supplied Codex Office
> robot identity. Each status row progresses through five baseline-aligned
> action frames; frame three closes both eyes for a visible blink and all other
> frames keep the eyes open. Preserve status props, cream/navy/amber/coral/teal
> pixel art, cell gutters, and a removable flat chroma-green background. No
> text, watermark, borders, shadows, overlap, or whole-character translation.

See `docs/design/OFFICE_VISUAL_SYSTEM.md` for the asset pipeline, conventions,
and deterministic manifest.
