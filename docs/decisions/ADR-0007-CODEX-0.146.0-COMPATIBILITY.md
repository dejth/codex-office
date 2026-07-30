# ADR-0007 — Codex CLI 0.146.0 compatibility

Status: Accepted

## Context

Codex Office fails closed on every Codex App Server version outside its exact
allowlist. The local stable CLI advanced from 0.145.0 to 0.146.0, so the 0.1.0
Marketplace build correctly degraded but could no longer show workspace
inventory or the optional shared status overlay. Its unsupported-version copy
also retained an older 0.138.0 label.

Compatibility cannot be inferred from semantic version proximity. The provider
contract requires regenerated schema evidence for every newly accepted version.

## Evidence

On 2026-07-30, the installed user-local executable reported:

```text
codex-cli 0.146.0
```

Stable and experimental schemas were generated outside the repository with:

```text
codex app-server generate-json-schema --out <temporary-directory>/standard
codex app-server generate-json-schema --experimental \
  --out <temporary-directory>/experimental
```

The stable 0.146.0 schema retains every request and bounded field consumed by
the production provider:

- `initialize` with `optOutNotificationMethods`;
- `thread/list` with `useStateDbOnly`;
- `thread/loaded/list`;
- `thread/read` with `includeTurns`;
- `account/rateLimits/read`;
- `Thread.updatedAt`; and
- the pinned notification names used only as schema evidence:
  `thread/started`, `thread/status/changed`, `thread/closed`, and
  `thread/tokenUsage/updated`.

No session list, thread, prompt, response, command, file content, path, raw
payload, account identifier, or token value was recorded for this comparison.
Generated files remained temporary and are not release artifacts.

## Decision

- Move the exact runtime and bundled-schema allowlist from 0.145.0 to 0.146.0.
- Continue accepting only the verified `Codex Desktop/` and Extension Host
  `codex-office/` fingerprints.
- Continue rejecting older, newer, malformed, repeated, mixed, or ambiguous
  fingerprints without returning the raw value.
- Keep `experimentalApi: false`, `usage: false`, and `liveUpdates: false`.
- Preserve `useStateDbOnly: true`, `includeTurns: false`, content-bearing
  notification opt-outs, the owner-only Unix socket check, and all existing
  bounded projections.
- Update user-facing compatibility copy to the same exact version.

## Consequences

Codex Office 0.1.1 can use the verified privacy-minimized metadata boundary on
Codex CLI 0.146.0. Codex 0.145.0 and every other version now fail closed until
separately regenerated and verified. This decision adds no network call,
telemetry, remote persistence, content ingestion, agent control, or token-usage
claim.
