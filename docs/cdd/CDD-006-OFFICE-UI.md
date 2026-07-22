# CDD-006 — Office UI Contract

Status: Accepted for prototype

## Modes

Office and Meter share selection, filters, timestamps, and domain state. Switching modes must not reset selection or provider state.

## State-to-motion mapping

Thinking: thought bubble; reading: shelf/reading pose; editing: desk typing; running command: terminal station; waiting approval: high-priority badge; completed: calm success pose; failed: non-flashing warning; idle: subtle rest; unknown: neutral question state.

Animations communicate atmosphere, never the sole meaning. Text and icon labels are always available.

## Responsive behavior

At narrow width, prioritize agent, status, and total. Inspector becomes an in-view drill-down. Meter uses compact rows rather than wide charts.

## Accessibility gates

Keyboard traversal, visible focus, appropriate headings, live-region restraint, 200% zoom, high contrast, reduced motion, and no essential color-only cues.
