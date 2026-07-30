# Task: Support Codex 0.146.0 and prepare patch release

Status: Ready for maintainer review
Owner: Dex
Governing contract: CDD-004, CDD-007
Depends on: Task 049

## Context

Codex Office's exact compatibility gate accepts 0.145.0 while the current
installed stable CLI is 0.146.0. The unsupported-version notice also contains
an older 0.138.0 label. Regenerate content-free schema evidence, move the exact
gate to the verified version, and prepare version 0.1.1 for human-approved
Marketplace publication.

## Owned files

- `src/providers/codex/capabilities.ts`
- `src/webview/connection-notice.tsx`
- corresponding provider and webview tests
- provider contract and version evidence ADR
- release metadata, documentation, and this task

## Explicit non-goals

- Supporting unverified Codex versions or version ranges.
- Reading prompts, turns, commands, paths, raw payloads, or real usage data.
- Adding telemetry, remote persistence, steering, or per-agent token claims.
- Publishing, pushing, or merging without the required human gate.

## Acceptance criteria

- [x] Exact Codex 0.146.0 fingerprints pass capability negotiation.
- [x] Other, malformed, repeated, or ambiguous fingerprints fail closed.
- [x] User-facing compatibility text consistently reports 0.146.0.
- [x] Regenerated 0.146.0 schema evidence covers every consumed method and field.
- [x] Version 0.1.1 candidate passes release gates and package audit.
- [x] Marketplace publication remains explicitly human-approved.

## Verification

- [x] Targeted tests
- [x] `pnpm check`
- [x] VSIX package and clean-profile lifecycle
- [x] Privacy/security impact recorded
- [x] Handoff complete
