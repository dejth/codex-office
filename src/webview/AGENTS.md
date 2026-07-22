# Webview Agent Rules

- The webview renders sanitized domain snapshots only; it never reads the filesystem or starts processes.
- Office and Meter are equal views of the same state, not separate data models.
- Keyboard, screen-reader, high-contrast, narrow-width, and reduced-motion behavior are acceptance criteria.
- Keep animation state separate from domain state.
- Avoid heavy chart/game dependencies until measurements justify them.
- UI tests use fixtures and must not require a live Codex session.
