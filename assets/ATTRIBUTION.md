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

See `docs/design/OFFICE_VISUAL_SYSTEM.md` for the asset pipeline, conventions,
and deterministic manifest.
