# Office Visual System

The v0.1 Office uses a local nine-status pixel-art set. Each status has a
five-frame production sprite while readable status text and station labels
remain the authoritative cues.

## Visual language

- Palette: cream body, deep navy outlines, amber highlights, coral alerts, and
  teal success accents.
- Grid: one transparent 640 × 128 sprite sheet per status containing five
  eye-registered 128 × 128 frames.
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
the first open-eye frame visible. The third frame is a short closed-eye blink.
Warning states never flash.

Room chrome uses VS Code theme variables for light, dark, and high-contrast
compatibility. Asset colors are supplementary: status is also conveyed by text,
station name, and non-color pose/prop changes.

## Asset pipeline and baselines

The source atlas was generated specifically for this repository from the prompt
recorded in `assets/ATTRIBUTION.md`. The production steps are:

1. Remove the chroma background to transparency.
2. Crop one five-frame horizontal strip for each status.
3. Overlay the five cells in each status strip to calculate one union crop, then
   apply that exact crop to every frame. Never trim frames independently.
4. Register each frame horizontally to the shared hot-pink eye center, then
   align standing feet to y=120 or furniture scenes to y=124. Thinking and
   unknown use the documented larger art scale so their body width matches the
   production set despite their overhead bubbles.
5. Resize onto a shared 128 × 128 safe canvas with nearest-neighbor sampling.
6. Use flat green (`#00ff00`) for generated source backgrounds and hot-pink
   (`#ff4fa3`) eyes so chroma removal cannot erase the open-eye pixels. Apply
   edge contraction and despill before sprite assembly.
7. Preserve each generated status action after registration. Frame three must
   retain closed eyes, while frames one, two, four, and five keep open eyes.
8. Record bytes and SHA-256 hashes in `assets/office/manifest.json`.
9. Join the five registered action frames into a 640 × 128 RGBA sprite sheet.
10. Bundle only the nine production animation PNGs into `dist/assets`.

The manifest is the deterministic source baseline for Issue #9 visual
regression. Tests enforce:

- exactly nine named assets;
- five 128 × 128 frames in each RGBA PNG sprite sheet;
- stable horizontal eye anchors, exact canonical baselines, normalized visible
  body width, complete padding, visible blink, and no chroma fringe;
- SHA-256 stability;
- at most 90 KB per animation asset and 760 KB across static and animated
  production sets.

The raw atlases are retained in the repository for provenance but excluded
from the VSIX. `scripts/build-office-animations.sh` reproduces the shared-crop
assembly. Runtime assets are local and require no network access.
