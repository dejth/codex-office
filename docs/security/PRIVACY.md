# Privacy Requirements

## Default

Local-only, no telemetry, no analytics SDK, no cloud sync, no remote images/fonts, and no automatic issue uploads.

## Data minimization

Read only fields required for hierarchy, state, timestamp, and usage. Do not copy raw transcripts. Redact absolute paths and user content before logs or webview messages. Keep debug logging opt-in, bounded, and content-free.

## Retention

v0.1 persists preferences and minimal aggregates only. Future history must have retention duration, delete/export controls, schema migration, and clear storage location.

## Network assurance

Release review checks dependencies, source, and runtime for outbound connections. Marketplace links opened by explicit user action are distinct from background telemetry.
