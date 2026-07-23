# Office Visual System

The v0.1 Office uses a local nine-status pixel-art set. Each status has a
two-frame production sprite while readable status text and station labels
remain the authoritative cues.

## Visual language

- Palette: cream body, deep navy outlines, amber highlights, coral alerts, and
  teal success accents.
- Grid: one transparent 128 × 64 sprite sheet per status containing two
  baseline-aligned 64 × 64 frames.
- Scale: preserve square proportions and use nearest-neighbor
  (`image-rendering: pixelated`) rendering.
- Silhouette: the same small office robot appears in every state; pose and
  nearby props distinguish the activity.
- Background: transparent. Room surfaces, focus, and theme colors are CSS using
  VS Code theme tokens.

## Status mapping

| Status           | Visual cue                             |
| ---------------- | -------------------------------------- |
| Thinking         | Contemplative pose and thought marks   |
| Reading          | Open book                              |
| Editing          | Desk and keyboard                      |
| Running command  | Terminal display                       |
| Waiting approval | Raised hand and attention marker       |
| Completed        | Success pose and celebratory accent    |
| Failed           | Recovery pose and non-flashing warning |
| Idle             | Resting pose                           |
| Unknown          | Neutral question pose                  |

The image is decorative (`aria-hidden`). Status text, station text, selection
state, tree semantics, and accessible names must remain available without it.

## Motion and theme behavior

Motion advances between genuine action frames by changing the sprite sheet
background position. It does not simulate action by moving the complete
bitmap. Both the `codexOffice.reducedMotion` setting and
`prefers-reduced-motion` disable all Office animation and transitions, leaving
the first frame visible. Warning states never flash.

Room chrome uses VS Code theme variables for light, dark, and high-contrast
compatibility. Asset colors are supplementary: status is also conveyed by text,
station name, and non-color pose/prop changes.

## Asset pipeline and baselines

The source atlas was generated specifically for this repository from the prompt
recorded in `assets/ATTRIBUTION.md`. The production steps are:

1. Remove the chroma background to transparency.
2. Crop the 3 × 3 atlas in documented status order.
3. Resize each crop to 128 × 128 with nearest-neighbor sampling.
4. Record bytes and SHA-256 hashes in `assets/office/manifest.json`.
5. Pair the two action frames into a 128 × 64 RGBA sprite sheet.
6. Bundle only the nine production animation PNGs into `dist/assets`.

The manifest is the deterministic source baseline for Issue #9 visual
regression. Tests enforce:

- exactly nine named assets;
- 128 × 128 RGBA PNG files;
- SHA-256 stability;
- at most 20 KB per asset and 160 KB total.

The raw atlas is retained in the repository for provenance but excluded from the
VSIX. Runtime assets are local and require no network access.
