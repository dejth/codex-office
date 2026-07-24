# CDD-003 — Webview Protocol Contract

Status: Verified for protocol v1

Only sanitized, minimal messages cross the extension/webview boundary. Every message uses `protocolVersion: 1`; host messages also carry a nonnegative safe-integer sequence.

## Host to webview

- `snapshot`: complete replaceable `WebviewSnapshot` projection.
- `connection`: provider state and user-safe reason code.
- `settings`: theme-independent preferences.
- `refresh-requested`: tells the UI a manual refresh began.

## Webview to host

- `ready`.
- `select-agent` with opaque agent ID.
- `refresh`.
- `open-settings`.

## Forbidden fields

Prompt/response text, transcript events, commands, source content, absolute paths, environment variables, credentials, and raw provider payloads.

Every message is versioned and validated. Unknown message types are ignored with a safe reason code that callers may log without raw content.

## Snapshot projection

The host creates a fresh projection before sending domain state:

- provider/domain session, parent, task, name, and agent IDs do not cross the boundary;
- agents receive panel-local opaque IDs and generated labels;
- projection returns an opaque-to-domain ID map that the host caller must retain before enabling selections;
- usage is cloned and retains its provenance; and
- unresolved nodes expose only an opaque ID and bounded reason enum. Detailed diagnostics remain host-local.

Protocol v1 allows at most 1,000 total agents, a tree depth of 32, bounded strings, canonical UTC timestamps, and nonnegative safe token integers or `null`. Agent IDs must be globally unique across valid and unresolved records.

## Boundary behavior

- Both directions reject unknown versions, unknown types, extra fields, malformed enums, unsafe numbers, cyclic/shared object graphs, accessors, prototype-pollution keys, excessive depth, and oversized values.
- Parsing and projection failures are content-free and never echo raw values or throw across the boundary.
- Snapshot acceptance is atomic; callers preserve their last valid state when parsing fails.
- Within one webview instance, host messages are monotonic per message type; stale and replayed sequences are ignored. The host stops posting before sequence reuse.
- The webview sends `ready` after installing its listener. The host replies with validated settings, connection state, and a full snapshot.
- The webview starts from a static empty disconnected state, then the extension
  connects the local provider and sends a complete projected snapshot.
  Authoritative empty snapshots replace prior state. Provider refreshes are
  serialized, and results completed after view disposal are ignored.
