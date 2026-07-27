# Changelog

All notable changes follow Keep a Changelog and Semantic Versioning.

## [Unreleased]

### Added

- Show whether Agent status comes from the shared observer or persisted
  inventory without exposing transport details.
- Sort intact Office agent groups by reported activity: active work first,
  newest updates first within each class, and Unreported sessions last.
- Add a disabled-by-default Shared App Server experiment that can overlay
  owner-only local thread status without resuming agents or reading turns. Its
  WebSocket client is bundled into the extension while the existing total VSIX
  size gate remains unchanged.
- Verify the shared metadata contract against Codex CLI 0.145.0 and use an
  explicit Unix-domain connection for its current WebSocket handshake.
- Combine reported account capacity, root/subagent/thread counts, filters, and
  animated agents into one compact sidebar. Agent cards now share one footprint
  and root sessions use a subtle blue background plus a readable `Main` label.
- Compact the provider-backed shared Office, add status filters, remove mock
  room values, and collapse the duplicate keyboard hierarchy by default.
- Add an Unreported Office filter with a visible count for agents whose
  detailed status is unavailable from the provider.
- Hide empty per-thread Meter rows, technical fallback copy, and component
  disclosures when the provider reports no token usage, while retaining compact
  hierarchy counts.

### Added

- Reported account-capacity percentages and reset windows in Meter, kept
  explicitly separate from billing, credits, cost, and per-thread token usage.
- Version-gated persisted subagent hierarchy reconstruction with bounded
  generated agent nicknames and no transcript or path projection.
- Professional repository foundation, product contracts, agent workflow, and extension skeleton.
- Version-pinned Codex App Server hierarchy and reported-token evidence baseline for v0.1 provider work.
- Deterministic, privacy-safe Codex fixture corpus for hierarchy, malformed input, replay, resume, and usage boundaries.
- Provider-neutral hierarchy validation with deterministic ordering and explicit duplicate, orphan, cycle, and blocked-descendant handling.
- Fail-closed Codex 0.138.0 capability negotiation for privacy-safe snapshot polling.
- Versioned, runtime-validated extension/webview protocol with opaque snapshot projection and bounded payloads.
- Accessible agent-tree fixture preview with deterministic keyboard navigation, text status cues, and narrow-width layout.
- Deterministic code-native Office diorama with status stations, presentation-only motion state, and reduced-motion fallbacks.
- Honest Meter view with per-thread components, explicit provenance, overlap caveats, and safe handling of missing or overflowing usage.
- Production pixel-art Office characters for all statuses with local provenance, deterministic visual baselines, and enforced asset budgets.
- Privacy-minimized Codex 0.138.0 App Server snapshot polling with authoritative empty and degraded-state handling.
- Deterministic bundle/package budgets and isolated VS Code profile lifecycle validation.
- State-database-only Codex session discovery with workspace scoping, shell-free executable resolution, and conservative cross-process status labels.
- Honest provider-backed Office labels, reason-specific connection notices, and accessible connected, degraded, and disconnected empty states using local production artwork.
- Deterministic executable precedence that prefers a supported user-local Codex CLI over incompatible GUI-bundled candidates.
- A checked-in Extension Host launch configuration so F5 always loads the current workspace build instead of an editor-specific or stale debug target.
- Verified capability parsing for the `codex-office/0.138.0` Extension Host fingerprint without weakening the exact runtime allowlist.
- Workspace-required discovery and an isolated Extension Host profile that prevent global persisted-session flooding and unrelated extension noise during preview.
- Local two-frame pixel-art action sprites for every Office status, with deterministic frame stepping and static reduced-motion fallbacks.
- Five-frame Office animations with a dedicated blink frame, plus a monochrome mascot-head Activity Bar icon.
- Five-frame blinking animation for connected-empty, degraded, disconnected, and workspace-required Office mascots.

### Fixed

- Apply Office status filters to root sessions and show a clear empty state
  when no complete agent group matches.
- Fall back to the private workspace snapshot provider when the experimental
  shared transport cannot connect, preserving inventory and account capacity
  instead of rendering an empty unavailable Office.
- Keep the experimental shared observer connected while another Codex client
  is active by opting out of content-bearing notification bursts that the
  metadata-only sidebar neither reads nor displays.
- Label top-level cards as `Root` instead of implying every independent VS Code
  session is one main agent.
- Label provider-missing agent status as `Unreported` instead of the ambiguous
  `Unknown`.
- Keep compact Office agent names and statuses readable at narrow sidebar
  widths.
- Open the repository folder automatically in the isolated F5 Extension Host so
  workspace-scoped provider and Meter previews can connect.
- Reworked all nine Office animations around one larger, high-detail mascot
  identity with complete five-frame status actions, stable eye anchors, true
  alpha, and padded 128 × 128 frames rendered at up to 192 CSS pixels.
- Normalized standing and furniture baselines across statuses, matched the
  visible scale of thinking and unknown mascots, and repaired the thinking
  arm and centered ellipsis.
