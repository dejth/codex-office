# Task: Verify safe shared per-agent token usage

Status: Verified — implementation blocked by connection-scoped delivery
Owner: Dex
Governing contract: CDD-004, CDD-005, ADR-0003, ADR-0005
Depends on: Task 036, Task 037

## Context

Codex CLI prints a useful token summary when a remote session ends. Codex
Office must determine whether the same reported values can be attributed to
individual agent cards without reading terminal output, taking ownership of a
thread, or ingesting session content.

## Owned files

- `tasks/043-research-shared-agent-token-usage.md`
- `docs/cdd/CDD-005-USAGE.md`
- `docs/decisions/ADR-0003-CODEX-APP-SERVER-EVIDENCE.md`
- `docs/decisions/ADR-0005-OPT-IN-SHARED-APP-SERVER-STATUS.md`
- `CHANGELOG.md`

## Explicit non-goals

- Parsing terminal output or rollout JSONL.
- Calling `thread/resume`, starting, forking, or controlling a thread.
- Combining parent and child token totals.
- Changing the domain, webview protocol, provider, or UI.

## Acceptance criteria

- [x] Verify the current stable token notification fields from generated 0.145.0 schemas.
- [x] Verify whether a content-free request can read cumulative per-thread usage.
- [x] Verify the upstream notification and replay delivery scope.
- [x] Record a fail-closed product decision and a safe future unblock condition.
- [x] Keep the existing provider capability at `usage: false`.

## Verification

- [x] Targeted upstream schema and source review against `rust-v0.145.0`
- [x] `pnpm check`
- [x] Privacy/security impact recorded
- [x] Handoff complete

## Evidence

- Generated 0.145.0 TypeScript bindings expose
  `thread/tokenUsage/updated`, scoped by `threadId` and `turnId`, with total
  and last-call input, cached-input, cache-write-input, output, reasoning, and
  total token components.
- The stable request set has no standalone per-thread usage read or subscribe
  method. `thread/read` does not include cumulative token usage.
- Upstream routes notifications through the thread's subscribed connection
  IDs. Persisted usage replay is sent only to the connection that attaches to
  the thread.
- A bounded independent-listener run observed no cross-connection usage event,
  but no concurrent remote session was active, so that run is intentionally
  recorded as inconclusive rather than supporting evidence.

## Handoff

- Task / owner: Safe shared per-agent token usage research / Dex
- Outcome: Confirmed the data shape but blocked implementation because the
  accepted metadata-only observer cannot receive or read it without attaching.
- Files changed: task, CDD-005, ADR-0003, ADR-0005, changelog.
- Contract decisions: Keep `usage: false`; never scrape terminal output or
  rollout content; require an official content-free read/subscription API.
- Verification performed and result: Generated 0.145.0 schema and official
  tagged source review completed; `pnpm check` passed 24 files / 217 tests,
  lint, formatting, build, and bundle budgets.
- Privacy/security impact: No user prompt, turn, path, identifier, or token
  value was retained. No session was resumed or controlled.
- Known limitations: Agent cards cannot yet display the CLI exit summary.
- Follow-ups / dependencies: Revisit when Codex exposes a read-only,
  content-minimizing usage API to independent observers.
- Exact reviewer reproduction steps: Generate stable TypeScript bindings from
  Codex CLI 0.145.0, inspect the ClientRequest union and thread types, then
  compare the tagged App Server outgoing-message, thread lifecycle, and token
  replay sources linked from ADR-0003.
