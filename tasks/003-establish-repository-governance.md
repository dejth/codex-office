# Task: Establish repository governance

Status: Done
Owner: Dex
Governing contract: CDD-007
Depends on: Task 002

## Context

Complete the GitHub governance baseline for public v0.1 development with explicit ownership, protected branches, and a seeded project backlog.

## Owned files

- `.github/CODEOWNERS`
- `package.json`
- `START_HERE.md`
- `tasks/003-establish-repository-governance.md`

## Explicit non-goals

- Provider implementation or protocol assumptions.
- Marketplace publication, tagging, or release automation.
- Requiring an approval that would block a single-maintainer workflow.

## Acceptance criteria

- [x] Repository content has an explicit default code owner.
- [x] `main` and `develop` are protected by an active ruleset.
- [x] A GitHub Project contains the ten v0.1 seed issues.
- [x] Repository setup progress is accurately recorded.

## Verification

- [x] Targeted tests: verified the active `Protected branches` ruleset, ten open issues, ten linked project items, and required planning fields in GitHub.
- [x] `pnpm check`: typecheck, unit tests, lint, format check, and build passed.
- [x] Privacy/security impact recorded: code ownership and branch protections reduce unauthorized changes; issue content is synthetic and contains no session data; no runtime behavior changed.
- [x] Handoff complete: GitHub Project, issues, branch ruleset, toolchain pin, and repository checklist are reproducible from the linked artifacts.
