# Task: Prefer the user-local Codex CLI

Status: Complete
Owner: Coordinator (Dex)
Governing contract: CDD-004
Depends on: Issues #23 and #24

## Context

The Extension Development Host inherited a GUI PATH containing the ChatGPT
application's `0.145.0-alpha.30` Codex binary before the supported
`~/.local/bin/codex` `0.138.0`. First-executable resolution therefore produced
a false unsupported-version state.

## Owned files

- `src/providers/codex/transport.ts`
- `tests/providers/codex-transport.test.ts`
- `docs/cdd/CDD-004-CODEX-PROVIDER.md`
- `CHANGELOG.md`
- `tasks/016-prefer-user-local-codex.md`

## Acceptance criteria

- [x] Prefer bounded user-local installation locations before inherited PATH.
- [x] Keep resolution shell-free and paths host-only.
- [x] Cover conflicting GUI PATH candidates deterministically.
- [x] Verify the current provider bundle selects the supported user-local CLI.
- [x] Run `pnpm check`.
- [x] Complete independent read-only review.

## Handoff

- Task / owner: Issue #27 / Coordinator (Dex)
- Outcome: User-local Codex installations take precedence over GUI-injected
  PATH and bundled application candidates.
- Files changed: Transport candidate ordering, regression test, provider
  contract, changelog, and this task record.
- Contract decisions: User-local bounded locations express an explicit local
  installation choice and precede inherited GUI PATH entries.
- Verification performed and result: A bundled provider probe selected
  `~/.local/bin/codex` `0.138.0`, connected without a diagnostic, and returned
  175 sanitized persisted sessions. Independent review found no blocker.
  `pnpm check` passed 23 files / 179 tests.
- Privacy/security impact: No shell, telemetry, persistence, network request,
  provider payload, or executable path exposure was added.
- Known limitations: Version compatibility remains an exact allowlist.
- Follow-ups / dependencies: The existing Extension Development Host retained
  a different installed extension instance and spawned no Codex Office
  provider child after restart, so it was excluded as stale runtime evidence.
- Exact reviewer reproduction steps: Run the transport regression test and
  `pnpm check`; launch the Extension Development Host and confirm the
  unsupported-version notice is absent.
