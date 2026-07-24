# Webview Agent Rules

- The webview renders sanitized domain snapshots only; it never reads the filesystem or starts processes.
- Account capacity, hierarchy counts, and Office agents render in one compact
  view from the same sanitized snapshot.
- Keyboard, screen-reader, high-contrast, narrow-width, and reduced-motion behavior are acceptance criteria.
- Keep animation state separate from domain state.
- Avoid heavy chart/game dependencies until measurements justify them.
- UI tests use fixtures and must not require a live Codex session.
