# CDD-006 — Office UI Contract

Status: Implemented for provider-backed Office, state machine, and Meter

## Modes

Office and Meter share selection, filters, timestamps, and domain state. Switching modes must not reset selection or provider state.

## State-to-motion mapping

Thinking: thought bubble; reading: shelf/reading pose; editing: desk typing; running command: terminal station; waiting approval: high-priority badge; completed: calm success pose; failed: non-flashing warning; idle: subtle rest; unknown: neutral question state.

Animations communicate atmosphere, never the sole meaning. Text and icon labels are always available.

The Office machine projects only `status` plus the reduced-motion preference into presentation state: station, pose, accent, motion, and phase. Repeated snapshots do not restart motion. Status changes crossfade to the deterministic target; enabling reduced motion cuts directly to a static pose with no transition.

Both `codexOffice.reducedMotion` and the operating-system `prefers-reduced-motion` media query disable Office animation. Animation state never contains agent identity, task/session content, usage, paths, or provider data.

## Responsive behavior

At narrow width, prioritize agent, status, and total. Inspector becomes an in-view drill-down. Meter uses compact rows rather than wide charts.

## Provider and empty states

- Production UI describes provider-backed content as local sessions. It never
  labels provider data as synthetic or implies that persisted session status is
  live.
- A connected authoritative empty snapshot renders an idle character with
  readable guidance to start a Codex session in the current workspace.
- A host with no open workspace renders workspace-required guidance and never
  presents global persisted sessions as current agents.
- Degraded and disconnected states render failed and unknown characters
  respectively, alongside non-color text. The character is decorative; the
  heading and detail carry the meaning.
- Connection notices preserve only the protocol's bounded reason enum. Missing
  executable, unavailable transport, unsupported version, and invalid data each
  receive specific recovery-oriented copy without exposing commands, paths,
  payloads, or session content.
- Empty-state artwork uses the same local five-frame production motion and
  reduced-motion gates as agent cards. It introduces no network requests.

## Meter behavior

- Office and Meter render the same sanitized snapshot and share selection state.
- The summary exposes visible main-agent, subagent, and thread counts. Cross-thread totals remain unavailable when multiple cumulative thread snapshots contribute.
- Rows expose exact hierarchy depth in their accessible names and cap visual indentation after level four for narrow layouts. Per-thread total, status, and provenance remain visible at a glance; input, cached input, and output are available in native disclosure controls.
- Unknown values render as `—`, distinct from a reported zero.
- A visible explanation defines reported, derived, and estimated values and warns that parent/child context may overlap.

## Accessibility gates

Keyboard traversal, visible focus, appropriate headings, live-region restraint, 200% zoom, high contrast, reduced motion, and no essential color-only cues.

## Fixture tree behavior

- The extension host explicitly sends a deterministic, sanitized preview `WebviewSnapshot`; it never requires a live Codex session, filesystem access, or network access. Later authoritative snapshots, including empty ones, replace it atomically.
- Synthetic labeling belongs only to explicit fixture and test harnesses, not
  the production Office view.
- The hierarchy uses `tree`, `treeitem`, and `group` semantics with one roving tab stop.
- Up/Down move through visible agents, Right moves to the first child, Left moves to the parent, Home/End move to the bounds, and Enter/Space select.
- Every status has both an icon and readable text. Accessible names include agent, status, and usage availability.
- At widths up to 360 px, cards stack identity/status above usage while preserving hierarchy and focus behavior.
- Fixture selection lives above the Office/Meter branch so switching modes does not reset it.
- The code-native Office diorama and accessible tree are parallel views of the same snapshot and selection. The tree remains available beneath the visual floor.

## Production visual assets

The Office uses one local, transparent five-frame pixel-art sprite per
supported status. Frame three is a brief eye blink; the remaining frames change
the character action or prop rather than translating the whole bitmap. Images
are decorative and never replace readable status, station, hierarchy, or
selection cues. Runtime rendering makes no network requests.

Asset identity, dimensions, hashes, and size budgets are versioned in
`assets/office/manifest.json`; palette, scaling, motion, theme behavior, and the
generation pipeline are documented in `docs/design/OFFICE_VISUAL_SYSTEM.md`.
Raw generation sources are retained for provenance but excluded from packaged
extensions.
