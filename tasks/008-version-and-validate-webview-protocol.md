# Task: Version and validate webview protocol

Status: Complete
Owner: Coordinator (Dex) with Protocol agent
Governing contract: CDD-003
Depends on: Issue #3

## Context

Issue #5 creates the runtime-validated, versioned boundary between the extension host and webview using sanitized provider-neutral domain data only.

## Owned files

- `src/protocol/webview.ts`
- `src/extension/view-provider.ts`
- `src/webview/main.tsx`
- `src/webview/styles.css`
- `tests/protocol/webview.test.ts`
- `tasks/008-version-and-validate-webview-protocol.md`
- `docs/cdd/CDD-003-WEBVIEW-PROTOCOL.md`
- `CHANGELOG.md`

## Explicit non-goals

- Implementing the final agent-tree or Meter UI.
- Sending raw provider payloads, unresolved provider diagnostics, prompts, transcripts, commands, file content, or paths.
- Supporting multiple protocol versions or compatibility shims in v0.1.
- Adding network communication or persistence.

## Acceptance criteria

- [x] Define a versioned discriminated-union message schema.
- [x] Validate extension-to-webview messages at the boundary.
- [x] Send only sanitized provider-neutral snapshots.
- [x] Add contract tests for valid, invalid, and version-mismatch messages.

## Verification

- [x] Targeted tests
- [x] `pnpm check`
- [x] Privacy/security impact recorded
- [x] Handoff complete

## Agent handoff

- Task / owner: Issue #5 / Coordinator (Dex) with protocol implementation and independent review agents.
- Outcome: Added protocol v1 schemas, strict bidirectional validation, bounded privacy-safe snapshot projection, sequence replay protection, and extension/webview integration.
- Files changed: See the owned-files list above.
- Contract decisions: Raw provider/domain identifiers and user content remain host-only; projections mint opaque agent IDs and a safe snapshot ID; host messages use per-type monotonic sequences.
- Verification performed and result: Protocol contract tests pass (28); full `pnpm check` passes (6 files, 83 tests).
- Privacy/security impact: No telemetry, network calls, or persistence added. Parsers fail content-free; raw session, agent, parent, name, task, path, prompt, transcript, and provider payload fields cannot cross the boundary.
- Known limitations: The scaffold sends an empty initial snapshot. Live provider wiring, agent selection, and final tree rendering remain later issues.
- Follow-ups / dependencies: Issue #6 consumes the validated snapshot contract; provider integration must retain the returned opaque-ID map before enabling selection.
- Exact reviewer reproduction steps: Run `pnpm test -- tests/protocol/webview.test.ts`, then `pnpm check`.
