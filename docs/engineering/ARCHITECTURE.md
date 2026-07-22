# Architecture

```text
Codex App Server / local rollout fallback
                  |
            Codex Provider
        validate + normalize + capability check
                  |
          Provider-neutral domain
       hierarchy + status + usage provenance
                  |
          VS Code Extension Host
     lifecycle + persistence + safe messaging
                  |
            Sidebar Webview
      Office | Meter | Agent Inspector
```

## Boundaries

- Provider code knows Codex protocol but not VS Code presentation.
- Domain code is pure and platform-independent.
- Extension code owns privileged APIs and sanitization.
- Webview code is unprivileged and receives only minimal snapshots.

## Data flow

Inbound events are schema-validated, capability-checked, normalized, reduced into a snapshot, sanitized, and sent as a versioned message. UI renders the latest whole snapshot; incremental rendering may be optimized later without changing semantics.

## Persistence

v0.1 stores only settings and minimal aggregate cache through VS Code storage. Raw transcripts are never copied. Any history store requires retention controls, schema versioning, and a privacy ADR.

## Performance budgets

No polling faster than necessary; debounce event bursts; avoid parsing entire rollout files repeatedly; keep extension activation lazy; measure webview bundle size before adding PixiJS or chart libraries.
