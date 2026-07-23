# CDD-006 — Office UI Contract

Status: Implemented for fixture tree and Office state machine; Meter pending

## Modes

Office and Meter share selection, filters, timestamps, and domain state. Switching modes must not reset selection or provider state.

## State-to-motion mapping

Thinking: thought bubble; reading: shelf/reading pose; editing: desk typing; running command: terminal station; waiting approval: high-priority badge; completed: calm success pose; failed: non-flashing warning; idle: subtle rest; unknown: neutral question state.

Animations communicate atmosphere, never the sole meaning. Text and icon labels are always available.

The Office machine projects only `status` plus the reduced-motion preference into presentation state: station, pose, accent, motion, and phase. Repeated snapshots do not restart motion. Status changes crossfade to the deterministic target; enabling reduced motion cuts directly to a static pose with no transition.

Both `codexOffice.reducedMotion` and the operating-system `prefers-reduced-motion` media query disable Office animation. Animation state never contains agent identity, task/session content, usage, paths, or provider data.

## Responsive behavior

At narrow width, prioritize agent, status, and total. Inspector becomes an in-view drill-down. Meter uses compact rows rather than wide charts.

## Accessibility gates

Keyboard traversal, visible focus, appropriate headings, live-region restraint, 200% zoom, high contrast, reduced motion, and no essential color-only cues.

## Fixture tree behavior

- The extension host explicitly sends a deterministic, sanitized preview `WebviewSnapshot`; it never requires a live Codex session, filesystem access, or network access. Later authoritative snapshots, including empty ones, replace it atomically.
- The hierarchy uses `tree`, `treeitem`, and `group` semantics with one roving tab stop.
- Up/Down move through visible agents, Right moves to the first child, Left moves to the parent, Home/End move to the bounds, and Enter/Space select.
- Every status has both an icon and readable text. Accessible names include agent, status, and usage availability.
- At widths up to 360 px, cards stack identity/status above usage while preserving hierarchy and focus behavior.
- Fixture selection lives above the Office/Meter branch so switching modes does not reset it.
- The code-native Office diorama and accessible tree are parallel views of the same snapshot and selection. The tree remains available beneath the visual floor.
