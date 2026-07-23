# Task: Fix provider discovery and executable diagnostics

Status: Complete
Owner: Coordinator (Dex) with provider and review agents
Governing contract: CDD-003, CDD-004
Depends on: Issue #9

## Context

An isolated App Server's loaded-thread list is process-local. Production
discovery must use the state database without reading turns or rollout files,
and must report executable and compatibility failures without sensitive data.

## Owned files

- Provider agent: `src/providers/codex/**`, `tests/providers/**`
- Coordinator: extension wiring, protocol contracts, docs, changelog, task
- Review agent: read-only

## Explicit non-goals

- Private ChatGPT IPC, process-pipe attachment, rollout scanning, resume, or
  steering.
- Claiming cross-process runtime status as live.
- Marketplace, publishing, or release changes.

## Acceptance criteria

- [x] Discover persisted sessions with `thread/list` and
      `useStateDbOnly: true`.
- [x] Filter by workspace when available and strip sensitive provider fields.
- [x] Resolve the Codex executable deterministically and expose bounded reasons.
- [x] Preserve authoritative empty, refresh, disposal, and last-safe behavior.
- [x] Document the supported discovery boundary honestly.

## Verification

- [x] Targeted tests
- [x] `pnpm check`
- [x] Privacy/security impact recorded
- [x] Handoff complete

## Handoff

- Task / owner: Issue #23 / Coordinator (Dex) with provider and review agents
- Outcome: Replaced process-local loaded discovery with privacy-minimized
  persisted-session discovery and added GUI-safe executable resolution,
  diagnostics, polling, and transport recovery.
- Contract decisions: `thread/list` always uses `useStateDbOnly: true`, an
  exact workspace filter when available, and explicit CLI/VS Code/exec/App
  Server/subagent source kinds. Cross-process `notLoaded` remains `unknown`.
- Verification performed and result: independent provider-scope review found
  no blocker; `pnpm check` passed 23 files / 169 tests.
- Privacy/security impact: No rollout scanning, turns, resume, private IPC,
  shell invocation, raw names, prompts, paths, Git metadata, or payloads cross
  the provider boundary.
- Known limitations: Cross-process runtime state remains unavailable through
  the supported interface. Windows npm-only `.cmd` shims are not verified;
  native `codex.exe` is supported.
- Follow-ups / dependencies: Issue #24 replaces misleading synthetic/empty UI
  and visually verifies the result.
- Exact reviewer reproduction steps: run `pnpm check`; inspect synthetic
  provider calls in `tests/providers/codex-provider.test.ts`.
