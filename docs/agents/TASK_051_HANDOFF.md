# Agent Handoff

- Task / owner: Task 051 / Dex
- Outcome: Codex Office 0.1.2 preserves strict runtime validation while letting
  compatible unverified runtimes show persisted inventory; verified Shared
  status falls back safely, and Marketplace details are now user-first.
- Files changed: Provider capability and fallback behavior; compatibility UI
  copy and tests; Marketplace README and metadata; ADR-0008, CDDs, release
  validation, changelog, and task records.
- Contract decisions: Persisted inventory may runtime-probe a canonical Codex
  fingerprint through strict bounded responses. Shared observer status remains
  exactly verified for Codex 0.146.0 and otherwise falls back.
- Verification performed and result: 61 focused compatibility/UI tests pass;
  `pnpm check` passes 25 files / 231 tests; production audit has no known
  vulnerability; the 24-file, 689,212-byte VSIX passes package audit with
  SHA-256 `cba7515bcc0c73470a88baf2e278a498100d9f01c2f774f2624b6d8df9757d0f`;
  clean install and genuine 0.1.1 upgrade pass on VS Code 1.131.0; installed
  0.1.2 activates and connects to the verified Shared observer.
- Privacy/security impact: No telemetry, remote persistence, content
  ingestion, new permission, steering, or per-agent token claim. Unverified
  runtimes cannot publish inventory until strict schemas pass.
- Known limitations: Runtime probing cannot promise compatibility with every
  future App Server. Shared live status remains version-pinned.
- Follow-ups / dependencies: Complete. The maintainer published 0.1.2 manually
  on 2026-07-30, and the public Gallery API subsequently reported version
  0.1.2. Marketplace description caches may refresh separately from the public
  version record.
- Exact reviewer reproduction steps: Run the commands in
  `docs/release/V0.1.2_VALIDATION.md`, install the candidate VSIX, and verify
  both persisted fallback and verified Shared observer behavior.
