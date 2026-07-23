# Task: Accept the verified Extension Host fingerprint

Status: Complete
Owner: Coordinator (Dex)
Governing contract: CDD-004 and ADR-0003
Depends on: Issue #29

## Context

The supported Codex `0.138.0` App Server identifies itself as
`codex-office/0.138.0` when launched from the current Extension Host. The
capability gate accepted only `Codex Desktop/0.138.0`, producing a false
unsupported-version state.

## Owned files

- `src/providers/codex/capabilities.ts`
- `tests/providers/codex-capabilities.test.ts`
- `docs/cdd/CDD-004-CODEX-PROVIDER.md`
- `docs/decisions/ADR-0003-CODEX-APP-SERVER-EVIDENCE.md`
- `CHANGELOG.md`
- `tasks/018-accept-extension-host-fingerprint.md`

## Acceptance criteria

- [x] Accept only the two verified runtime prefixes.
- [x] Retain the exact `0.138.0` allowlist.
- [x] Reject repeated, mixed, malformed, and unknown fingerprints.
- [x] Add deterministic regression coverage.
- [x] Verify current Extension Host connection and rendering.
- [x] Run `pnpm check`.
- [x] Complete independent read-only review.

## Handoff

- Task / owner: Issue #30 / Coordinator (Dex)
- Outcome: The supported local App Server now passes the capability gate in the
  Extension Host and renders persisted sessions without an unsupported banner.
- Files changed: Capability parser, regression tests, provider contract,
  evidence ADR, changelog, and this task record.
- Contract decisions: Prefixes and version remain allowlisted; parsing does not
  accept arbitrary product/version text.
- Verification performed and result: Extension Host showed `Local sessions`,
  rendered agent cards, and showed neither unsupported-version nor
  provider-unavailable. `pnpm check` passed 24 files / 187 tests. Independent
  review findings were resolved.
- Privacy/security impact: Raw fingerprints remain unlogged and unprojected.
  No path, payload, prompt, telemetry, network, or persistence was added.
- Known limitations: Other Codex versions and prefixes remain unsupported until
  separately evidenced.
- Follow-ups / dependencies: None.
- Exact reviewer reproduction steps: Run capability tests and `pnpm check`;
  launch **Run Codex Office Extension** and inspect the workspace-scoped view.
