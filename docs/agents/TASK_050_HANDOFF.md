# Agent Handoff

- Task / owner: Tasks 049 and 050 / Dex
- Outcome: README badges added and Codex Office 0.1.1 candidate verified for
  exact Codex CLI 0.146.0; external GitHub and Marketplace actions remain gated.
- Files changed: README and changelog; provider capability gate and tests;
  unsupported-version copy and test; CDD-004, ADR-0005 follow-up, ADR-0007;
  Marketplace/release validation; package version; task records.
- Contract decisions: Exact 0.146.0 only. Older, newer, malformed, mixed, or
  ambiguous fingerprints still fail closed. Privacy-minimized polling,
  content-bearing notification opt-outs, `usage: false`, and `liveUpdates:
false` are unchanged.
- Verification performed and result: 54 targeted tests pass; `pnpm check`
  passes 25 files / 224 tests; production audit reports no known
  vulnerabilities; all three badge URLs return HTTP 200; package audit passes
  24 files / 688,112 bytes; clean install and genuine 0.1.0 upgrade pass on VS
  Code 1.96.4 and 1.131.0; installed 0.1.1 sidebar connects to Codex 0.146.0
  without the unsupported-version notice.
- Privacy/security impact: No telemetry, remote persistence, content
  ingestion, new permission, steering, or per-agent token claim. Schema and
  runtime checks retained only bounded version/method evidence.
- Known limitations: Other Codex versions remain unsupported. Marketplace
  publication, GitHub push, PR, merge, and tagging have not occurred.
- Follow-ups / dependencies: Maintainer reviews this handoff and candidate,
  then explicitly authorizes the external publication workflow.
- Exact reviewer reproduction steps: Run `pnpm check`, `pnpm audit --prod`,
  `pnpm exec vsce ls`, package `artifacts/codex-office-0.1.1.vsix`, run the
  budget and clean-profile commands in `docs/release/V0.1.1_VALIDATION.md`,
  then install the VSIX and open Codex Office with Codex CLI 0.146.0.
