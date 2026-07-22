# Threat Model

## Assets

Source code, prompts/responses, paths, commands, agent/task names, usage metadata, credentials, Codex session integrity, and Marketplace publishing credentials.

## Threats and controls

- Malformed rollout/event input → schema validation, bounds, safe failure.
- Sensitive data exposed to webview/log → allowlisted DTOs and tests.
- Webview script injection → no raw HTML, strict CSP, nonce, local resources.
- Dependency compromise → lockfile, review, audit, minimal dependencies.
- Accidental agent control → read-only adapter and no mutation methods in v0.x.
- PAT leakage → GitHub environment secret, never local files/logs.
- Malicious contribution/release → protected branches, review, provenance/checksum, manual approval.
