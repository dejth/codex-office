# Task: Broaden safe Codex compatibility and clarify Marketplace details

Status: Complete
Owner: Dex
Governing contract: CDD-004, CDD-006, CDD-007
Depends on: Task 050

## Context

Codex Office 0.1.1 blocks the entire provider whenever the runtime is not the
exact schema-verified Codex CLI 0.146.0. Codex CLI and desktop bundles can ship
different versions, so this makes persisted workspace inventory unnecessarily
fragile. Preserve exact verification for experimental shared live status while
allowing the content-free persisted inventory to prove compatibility through
strict runtime response validation.

The Marketplace README also needs a user-first explanation of requirements,
status provenance, compatibility, troubleshooting, and privacy.

## Owned files

- Codex capability negotiation and provider fallback behavior
- Extension diagnostics and webview compatibility copy
- Corresponding provider, extension, protocol, and webview tests
- README, changelog, version metadata, CDD/ADR, release validation, and handoff

## Explicit non-goals

- Claiming that every Codex version or App Server protocol is supported.
- Enabling unverified shared live status.
- Reading prompts, turns, commands, paths, raw payloads, or real usage data.
- Adding telemetry, remote persistence, steering, or per-agent token claims.
- Uploading or publishing to the VS Code Marketplace.

## Acceptance criteria

- [x] Persisted inventory can connect on an unverified runtime only after every
      consumed response passes its existing strict bounded schema.
- [x] Experimental shared status remains limited to schema-verified versions
      and safely falls back to persisted inventory when incompatible.
- [x] Unsupported or malformed runtime data still fails closed without exposing
      executable paths, raw fingerprints, or provider payloads.
- [x] User-facing compatibility copy distinguishes inventory from live status.
- [x] Marketplace README explains setup, compatibility, status provenance,
      troubleshooting, and privacy in user-first language.
- [x] Version 0.1.2 candidate and release evidence are reproducible.

## Verification

- [x] Targeted tests
- [x] `pnpm check`
- [x] VSIX package and clean-profile lifecycle
- [x] Privacy/security impact recorded
- [x] Handoff complete
- [x] Maintainer publication independently verified through the public Gallery
      API
