# Task: Integrate provider and complete release validation

Status: Complete
Owner: Coordinator (Dex) with provider and validation agents
Governing contract: CDD-003, CDD-004, CDD-006, CDD-007
Depends on: Issues #4, #5, #6, #7, #8, #19

## Context

Issue #9 proves the real extension lifecycle in a clean VS Code environment.
The local App Server process is authoritative only for threads loaded into that
process; it cannot observe separate stdio processes. Rollout scanning and
content-bearing resume are not approved fallbacks.

## Owned files

- Provider agent: `src/providers/codex/**`, provider tests
- Coordinator: `src/extension/**`, extension tests, shared contracts, task
- Validation agent: `scripts/**`, release/visual tests and validation docs
- Shared changes require coordinator review before integration.

## Explicit non-goals

- Cross-process attachment, rollout scanning, or content-bearing resume.
- Usage/live-update claims beyond the accepted 0.138.0 capability contract.
- Publishing, tagging, secrets, Marketplace mutation, or release promotion.

## Acceptance criteria

- [x] Connect validated local App Server snapshots through the webview bridge.
- [x] Verify activation, disposal, refresh, authoritative empty, and failures.
- [x] Add deterministic visual and package/bundle budget gates.
- [x] Exercise accessibility and clean-profile lifecycle without real data.
- [x] Record exact supported/tested versions, limitations, and reproduction.

## Verification

- [x] Targeted tests
- [x] `pnpm check`
- [x] Privacy/security impact recorded
- [x] Handoff complete

## Handoff

- Task / owner: Issue #9 / Coordinator (Dex), provider and validation agents
- Outcome: Connected the privacy-minimized Codex 0.138.0 snapshot provider to
  the validated webview bridge and added deterministic integration/release
  gates.
- Files changed: Codex transport/provider, extension lifecycle, connection UI,
  integration/visual/release tests, budget/smoke scripts, contracts and
  validation evidence.
- Contract decisions: App Server stdio is local and process-scoped;
  `includeTurns: false`; no rollout scan/resume fallback. Empty is
  authoritative. Cross-process discovery remains unsupported.
- Verification performed and result: independent review found no remaining
  blocker; `pnpm check` passed 23 files / 162 tests; final VSIX 224,216 bytes
  with 22 allowlisted entries and SHA-256
  `8c47e314d22b00f804275fb2d8f8a12bdc7799cb6a97c04ad57b6ca4638a9dcb`;
  isolated install, synthetic upgrade, disable option, and uninstall passed on
  VS Code 1.129.1 macOS arm64.
- Privacy/security impact: No telemetry, network service, remote persistence,
  experimental API, prompt/turn/path transfer, or real-session fixture added.
- Known limitations: A new stdio process cannot observe threads owned by other
  stdio processes. VS Code 1.96.x and interactive release-candidate UI
  walkthrough remain Issue #10 release gates.
- Follow-ups / dependencies: Issue #10 performs final human UI walkthrough,
  minimum-version matrix, version/release artifacts, and publication approval.
- Exact reviewer reproduction steps: run `pnpm check`; package with
  `pnpm exec vsce package --out /tmp/codex-office-0.0.1.vsix`; run budget and
  isolated smoke commands from `docs/release/V0.1_VALIDATION.md`.
