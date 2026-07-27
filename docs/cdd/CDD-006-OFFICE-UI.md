# CDD-006 — Office UI Contract

Status: Implemented for unified provider-backed Office

## Unified view

One sidebar renders compact account capacity and hierarchy counts above the
filterable animated agent floor. There is no mode switch or duplicated
hierarchy presentation.

The Agent floor shows a compact non-color source badge: `Shared observer`,
`Persisted inventory`, or `Source unavailable`. The badge describes where
status came from; it does not claim that every discovered session is loaded or
live.

## State-to-motion mapping

Thinking: thought bubble; reading: shelf/reading pose; editing: desk typing; running command: terminal station; waiting approval: high-priority badge; completed: calm success pose; failed: non-flashing warning; idle: subtle rest; internal unknown: neutral question state labelled `Unreported` in the UI.

Animations communicate atmosphere, never the sole meaning. Text and icon labels are always available.

The Office machine projects only `status` plus the reduced-motion preference into presentation state: station, pose, accent, motion, and phase. Repeated snapshots do not restart motion. Status changes crossfade to the deterministic target; enabling reduced motion cuts directly to a static pose with no transition.

Both `codexOffice.reducedMotion` and the operating-system `prefers-reduced-motion` media query disable Office animation. Animation state never contains agent identity, task/session content, usage, paths, or provider data.

## Responsive behavior

At narrow width, prioritize account capacity, counts, agent identity, and
status. Account windows use compact progress rows rather than wide charts.

Provider-backed Office views render roots and subagents with the same compact
card footprint and character size. Roots use a subtle blue-tinted background
and a readable `Main` label. Cards reserve enough width for common agent names;
name and reported status occupy separate lines, while compact hierarchy labels
use `Main` and `Sub`. Readable All, Active, Waiting, Done,
and Unreported filters reduce visual density without changing the underlying
snapshot or selection. Unreported includes a count and means the provider found
the agent but did not supply a detailed status. Decorative room chrome must not
contain mock timestamps or other values that can be mistaken for provider data.

The room ranks intact parent/subagent groups by reported relevance: active
states first, attention states next, inactive states after them, and Unreported
last. Within the same class, the newest canonical `lastActivityAt` comes first;
stable opaque ID breaks ties. A descendant can promote its whole group, but the
parent remains before its children. Missing activity time sorts last within its
class and is never estimated.

Status filters apply to complete root groups rather than bypassing roots. A
group remains visible when its root or any descendant matches, preserving the
relationship context. When no group matches, the Office renders a readable
filter-specific empty state and exposes no hidden cards to keyboard focus.

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

## Account overview behavior

- The overview presents bounded primary and secondary account-capacity windows
  above the Office when the pinned local provider reports them. Each window
  shows percentage used, duration, reset time, and an explicit
  `not billing data` disclaimer.
- Account capacity is never presented as per-thread token usage, cost, credits,
  or a cross-thread total. Missing capacity renders as unavailable.
- The summary exposes root-session, subagent, and thread counts.
- Per-thread token rows remain hidden while the provider reports no
  content-free thread usage.

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
- The Office diorama is the primary accessible agent control and does not
  duplicate the full hierarchy below the room. It exposes one roving tab stop:
  arrow keys traverse the currently visible agents, Home and End move to the
  bounds, and Enter or Space selects through native button behavior.

## Production visual assets

The Office uses one local, transparent five-frame pixel-art sprite per
supported status. Each frame is a 128 × 128 safe canvas rendered at up to
192 CSS pixels with nearest-neighbor scaling. Frame three is a brief eye blink.
All frames share a generated status-specific action strip. Horizontal
registration uses the same pink-eye center; standing feet use baseline 120 and
furniture scenes use visual baseline 124. Open-eye frames preserve a visible
pink eye color. Props must remain complete and padded inside every frame.
Images are decorative and never replace readable status,
station, hierarchy, or selection cues. Runtime rendering makes no network
requests.

Asset identity, dimensions, hashes, and size budgets are versioned in
`assets/office/manifest.json`; palette, scaling, motion, theme behavior, and the
generation pipeline are documented in `docs/design/OFFICE_VISUAL_SYSTEM.md`.
Raw generation sources are retained for provenance but excluded from packaged
extensions.
