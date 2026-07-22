# Provider Agent Rules

- Codex is the only supported provider before v1.0.
- Treat upstream protocol fields as untrusted and validate at the boundary.
- Preserve raw identifiers internally but never expose transcript content to the webview.
- App Server integration is primary; rollout parsing is a documented fallback.
- Fixture tests must cover missing fields, duplicate events, nested subagents, resume, and malformed input.
- Do not claim protocol stability without pinning evidence in an ADR.
