# ADR-0008 — Runtime-probed persisted inventory compatibility

Status: Accepted

## Context

Codex Office 0.1.1 required the App Server runtime to report exactly 0.146.0
before it requested persisted workspace inventory. This protected an
experimental protocol boundary, but it also blocked the complete extension
whenever Codex CLI and a desktop-bundled Codex shipped different versions.

Official Codex troubleshooting guidance states that the CLI and desktop app
can include different Codex versions. A rolling local installation therefore
cannot rely on one exact executable version being present everywhere.

Opening every version without validation would be unsafe. Codex App Server is
experimental, and compatible-looking semantic versions do not prove stable
methods, fields, status meaning, or privacy behavior.

## Decision

- Keep Codex 0.146.0 as the schema-verified runtime for experimental Shared
  observer status.
- Accept another runtime for private persisted inventory only when its
  `initialize` fingerprint has one trusted prefix, one bounded canonical
  semantic version (including a valid prerelease/build suffix), and no
  malformed control content.
- Mark that internal result `runtime-probed`, never `schema-verified`.
- Request only the existing content-free persisted inventory boundary:
  `thread/list` with `useStateDbOnly: true` and the optional bounded
  `account/rateLimits/read` projection.
- Publish no snapshot until `thread/list` passes the strict bounded schemas.
  Every later consumed page must pass the same checks; malformed, conflicting,
  cycling, or oversized data preserves the last safe snapshot and degrades.
- When a Shared observer runtime is not exactly verified, stop that transport
  before any loaded-thread request and retry through private persisted
  inventory.
- Continue discarding raw fingerprints, executable paths, prompts, turns,
  commands, file content, and unknown provider fields.

## Consequences

Compatible rolling Codex versions can retain workspace hierarchy without
waiting for a Marketplace release. Their detailed status remains `Unreported`
unless the Shared observer version has separate schema evidence. A future
protocol change that violates a consumed schema fails closed instead of
silently projecting changed semantics.

This improves availability without adding telemetry, network calls, remote
persistence, content ingestion, agent control, or per-agent token claims.
