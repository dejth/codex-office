# CDD-003 — Webview Protocol Contract

Status: Draft

Only sanitized, minimal messages cross the extension/webview boundary.

## Host to webview

- `snapshot`: complete replaceable `OfficeSnapshot`.
- `connection`: provider state and user-safe reason code.
- `settings`: theme-independent preferences.
- `refresh-requested`: tells the UI a manual refresh began.

## Webview to host

- `ready`.
- `select-agent` with opaque agent ID.
- `set-view` with `office | meter`.
- `refresh`.
- `open-settings`.

## Forbidden fields

Prompt/response text, transcript events, commands, source content, absolute paths, environment variables, credentials, and raw provider payloads.

Every message is versioned and validated. Unknown message types are ignored and logged only as a safe reason code.
