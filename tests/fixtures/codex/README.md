# Codex App Server synthetic fixture corpus

This directory contains deterministic, entirely synthetic provider fixtures for Codex CLI 0.138.0. They describe protocol-relevant projections and expected normalized outcomes; they are not captured traffic and do not prove live event ordering.

## Fixture envelope

Each file in `corpus/` contains:

- `fixtureVersion` and a synthetic, version-pinned `source`;
- a stable `caseId`, `intent`, and fixed UTC `receivedAt` timestamps;
- `input`, containing only hierarchy, status, and usage fields needed by Codex Office; and
- `expected`, documenting the future adapter's disposition, connection state, normalized agents, and content-free diagnostic codes.

Scenario metadata such as `delivery`, `connectionEpoch`, and `receivedAt` belongs to the fixture envelope, never inside an App Server notification. Thread inputs are deliberately minimized projections because full upstream thread records contain fields such as working directory, preview text, paths, and Git metadata that Codex Office must discard.

## Normalization rules encoded by the corpus

- Group threads by `sessionId` and use `parentThreadId` as the direct hierarchy edge.
- Keep missing usage as `null`.
- Treat `tokenUsage.total` as an absolute reported snapshot and never add notifications together.
- Within one connection epoch, treat an identical duplicate or replay as a no-op after the first replacement. A new epoch resets deduplication identity, so its first valid snapshot is a replacement even when values match retained stale state.
- Retain the last safe snapshot and degrade when required fields, types, or safe-integer rules fail.
- Treat a lower cumulative `totalTokens` in the same connection epoch as ambiguous: retain the prior snapshot and emit `cumulative-regression`. After an explicit new epoch, accept the first snapshot and all of its components as one replacement.
- Reject a 0.138.0 usage event missing required `cachedInputTokens`; never coerce it to zero.
- Preserve conflicting reported totals and components without inventing reconciliation arithmetic.
- Keep parent and child usage separate; never subtract apparently replayed context.

## Privacy review

Fixtures must not contain prompts, transcripts, response content, credentials, usernames, hostnames, real UUIDs, rollout data, or filesystem/workspace paths. `codex-fixture-corpus.test.ts` enforces synthetic provenance, deterministic IDs/timestamps, required case coverage, forbidden keys, and common sensitive value patterns. A manual review of all fixture strings remains required because arbitrary usernames and hostnames cannot be identified reliably by pattern alone.
