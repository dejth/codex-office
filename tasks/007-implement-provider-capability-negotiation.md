# Task: Implement provider capability negotiation

Status: Complete
Owner: Coordinator (Dex) with Provider agent
Governing contract: CDD-004
Depends on: Issues #1, #2, #3

## Context

Issue #4 implements a pure, fail-closed boundary that validates App Server initialization metadata and required interface capabilities before any provider data is normalized.

## Owned files

- `src/providers/codex/capabilities.ts`
- `tests/providers/codex-capabilities.test.ts`
- `tasks/007-implement-provider-capability-negotiation.md`
- `docs/cdd/CDD-004-CODEX-PROVIDER.md`
- `docs/decisions/ADR-0003-CODEX-APP-SERVER-EVIDENCE.md`
- `CHANGELOG.md`

## Explicit non-goals

- Starting, connecting to, or controlling an App Server process.
- Parsing thread or token notification payloads.
- Reading or retaining `codexHome`, prompts, transcripts, commands, paths, or raw events.
- Enabling experimental APIs by default.

## Acceptance criteria

- [x] Detect supported Codex interface and version capabilities.
- [x] Validate untrusted upstream fields at the provider boundary.
- [x] Degrade safely when required capabilities are absent.
- [x] Add contract tests for supported, unsupported, and malformed inputs.

## Verification

- [x] Targeted tests
- [x] `pnpm check`
- [x] Privacy/security impact recorded
- [x] Handoff complete

## Handoff

- Task / owner: Issue #4 / Coordinator (Dex) with Provider agent
- Outcome: A pure fail-closed boundary correlates the runtime App Server fingerprint with immutable bundled 0.138.0 schema evidence and reports only capabilities the current privacy-safe interface can deliver.
- Files changed: Capability module and tests, task record, CDD-004, ADR-0003, and changelog.
- Contract decisions: Exact 0.138.0 allowlist; partial `snapshot-polling`; hierarchy polling available; usage/live unavailable; experimental API disabled.
- Verification performed and result: `pnpm check` passed with 5 test files and 55 tests. The installed App Server fingerprint was checked through a redacted initialize handshake.
- Privacy/security impact: Raw fingerprints and sensitive initialize extras are validated, bounded, stripped, and never returned. Diagnostics contain only fixed codes and known method names.
- Known limitations: Polling cannot provide cumulative token usage. Privacy-safe live attachment remains gated on a separate accepted protocol decision.
- Follow-ups / dependencies: Issue #5 versions and validates the extension/webview protocol; later provider work must resolve the usage/live attachment gate.
- Exact reviewer reproduction steps: Run `pnpm check`; run `pnpm exec vitest run tests/providers/codex-capabilities.test.ts` for the focused 13-test suite.
