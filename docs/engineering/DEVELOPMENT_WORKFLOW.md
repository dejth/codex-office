# Development Workflow

## From idea to merge

1. Create/discuss an issue and identify the governing CDD.
2. Write acceptance criteria and privacy/security notes.
3. Coordinator decomposes work into non-overlapping tasks.
4. Agent implements against fixtures; reviewer independently checks contracts.
5. Run targeted tests continuously and `pnpm check` before handoff.
6. Open a focused PR with screenshots for UI changes.
7. Squash or rebase according to maintainer policy; merge only with green required checks.

## Branches and commits

Use short-lived branches and Conventional Commits. `main` must remain releasable. Do not mix refactors with behavior changes unless required and documented.

## Contract changes

Update CDD first when behavior changes. Add an ADR when changing protocol assumptions, privacy, persistence, public configuration, dependencies with privileged behavior, or release trust.
