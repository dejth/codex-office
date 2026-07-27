# ADR-0006 — Reported thread recency ordering

Status: Accepted

## Context

The Office previously displayed deterministic hierarchy order based on thread
creation time. Codex CLI 0.145.0 generated App Server v2 schemas define
`Thread.updatedAt` as the Unix timestamp in seconds when the thread was last
updated and allow `thread/list` sorting by `updated_at`.

Evidence was regenerated locally on 2026-07-27 with:

```text
codex app-server generate-json-schema --out <temporary-directory>
```

## Decision

- Strict provider schemas retain numeric `updatedAt` alongside the existing
  bounded identity, hierarchy, and status metadata.
- The provider exposes valid values as canonical nullable `lastActivityAt`.
  Missing or unsafe values are never inferred.
- Shared `thread/read` metadata may refresh the timestamp while continuing to
  request `includeTurns: false`.
- Webview protocol v2 projects only the canonical timestamp. It does not expose
  titles, previews, turns, commands, paths, or raw provider records.
- The Office ranks active, attention, inactive, then Unreported states. Within
  a class it uses newest reported activity and then stable opaque ID.
- Parent/subagent groups stay intact. A group inherits its best descendant rank
  so active child work is not buried below inactive groups.

## Consequences

The ordering is useful and deterministic without claiming that `updatedAt` is
continuous telemetry. Persisted sessions can still be Unreported and therefore
sort last. No network call, content ingestion, remote persistence, or steering
is introduced.
