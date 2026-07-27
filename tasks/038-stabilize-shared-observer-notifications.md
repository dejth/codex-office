# Task: Stabilize shared observer notification traffic

Status: Verified
Owner: Coordinator (Dex)
Governing contract: CDD-004
Depends on: Task 037, ADR-0005

## Scope

Prevent content-bearing App Server notification bursts from reaching the
metadata-only Shared App Server observer while another Codex client is actively
working.

## Owned files

- `src/providers/codex/provider.ts`
- `tests/providers/codex-provider.test.ts`
- `docs/decisions/ADR-0005-OPT-IN-SHARED-APP-SERVER-STATUS.md`
- `docs/cdd/CDD-004-CODEX-PROVIDER.md`
- `CHANGELOG.md`
- this task

## Non-goals

- Reading or projecting prompts, turns, item bodies, command output, file
  changes, reasoning, or realtime transcripts.
- Increasing the accepted inbound message-size boundary.
- Replacing metadata polling with notification-driven state.

## Acceptance criteria

- Initialization opts out of content-bearing notification methods supported by
  the pinned 0.145.0 schema.
- Lifecycle metadata polling and reported account capacity continue to work.
- A second client can remain active without disconnecting the observer.
- Tests prove the privacy opt-outs are sent and remain unique.
- `pnpm check`, packaging, and installed-VSIX verification pass.

## Handoff

- Outcome: Prevented the metadata-only shared observer from receiving
  content-bearing notification bursts while another Codex client is active.
- Contract decisions: Keep bounded polling as the live-state source; do not
  increase the transport payload limit or retain notification content.
- Verification: 31 targeted provider/transport tests, typecheck, live
  three-poll shared-daemon probe, 209-test `pnpm check`, package validation,
  and forced VSIX installation passed.
- Privacy/security impact: Initialization now opts out of prompt/response,
  command-output, file-change, reasoning, and realtime transcript
  notifications. No new data is retained or projected.
- Known limitations: The experimental contract remains pinned to Codex CLI
  0.145.0. Unreported sessions still cannot be assigned a live state.
- Reviewer reproduction:
  1. Reload the VS Code window after installing the latest VSIX.
  2. Keep `codexOffice.experimentalSharedAppServer` enabled.
  3. Run `codex --remote unix://` in this workspace and submit a task.
  4. Confirm Codex Office stays connected and the loaded root card changes
     status while reported capacity remains visible.
