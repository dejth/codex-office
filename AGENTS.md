# AGENTS.md — Repository Operating Contract

This file governs the entire repository. A nested `AGENTS.md` adds local rules for its subtree; the nearest file wins when rules conflict.

## Mission

Build a trustworthy, delightful VS Code sidebar that shows live Codex agent hierarchy, state, and reported token usage without exporting user data.

## Non-negotiables

1. Treat Codex session content and filesystem paths as sensitive.
2. Do not add telemetry, network calls, or remote persistence without an accepted ADR and explicit maintainer approval.
3. Label usage as `reported`, `derived`, or `estimated`; never imply billing accuracy.
4. Keep v0.x read-only. Agent steering, termination, and prompt submission are out of scope.
5. Preserve reduced-motion, keyboard navigation, and usable non-color status cues.
6. Do not silently broaden provider scope beyond Codex.

## Required workflow

1. Read `docs/cdd/README.md`, the relevant component CDD, and the nearest nested `AGENTS.md`.
2. Claim one bounded task from `tasks/` or create a task from the template.
3. State owned files and dependencies before editing.
4. Add or update tests with behavior changes.
5. Run `pnpm check`; record exceptions with exact evidence.
6. Update docs, changelog, fixtures, and ADRs when contracts change.
7. Provide a concise handoff using `docs/agents/HANDOFF_TEMPLATE.md`.

## Multi-agent rules

- The coordinator owns task decomposition, integration order, and release gates.
- Prefer file ownership boundaries: provider, domain, extension, webview, testing/docs.
- Agents must not edit files owned by another active agent without coordination.
- Shared contracts under `src/domain/` are changed by the domain owner or coordinator.
- No agent may publish, tag, push, create secrets, or mutate Marketplace state without explicit human approval.
- Review agents are read-only unless separately assigned a fix task.

## Definition of done

- Acceptance criteria pass.
- Relevant unit/integration/accessibility tests pass.
- No new TypeScript, lint, formatting, or packaging errors.
- Security and privacy implications are recorded.
- User-visible changes appear in `CHANGELOG.md`.
- A reviewer can reproduce the result from the handoff.

## Commands

```bash
pnpm build
pnpm test
pnpm typecheck
pnpm lint
pnpm check
pnpm package
```
