# Task: Harden project foundation

Status: Done
Owner: Dex
Governing contract: CDD-007
Depends on: Task 001

## Context

Make the initial open-source foundation reproducible, reviewable, and safe to package before Phase v0.1 implementation begins.

## Owned files

- `.gitignore`
- `.vscodeignore`
- `.github/workflows/ci.yml`
- `.github/pull_request_template.md`
- Root source and configuration files changed only by Prettier
- `tasks/002-harden-project-foundation.md`

## Explicit non-goals

- Provider protocol implementation or assumptions.
- Marketplace publication, tagging, or release automation.
- Changing the draft release contract status.

## Acceptance criteria

- [x] Local dependencies, build output, VSIX files, and OS metadata are ignored.
- [x] VSIX contents contain only runtime and Marketplace-facing files.
- [x] Pull requests and protected branches run the full quality gate.
- [x] The repository provides a review checklist for contributions.
- [x] `pnpm check` passes.

## Verification

- [x] Targeted tests: VSIX packaged successfully with 12 files and package contents reviewed.
- [x] `pnpm check`: typecheck, 1 unit test, lint, format check, and build all passed.
- [x] Privacy/security impact recorded: CI has read-only repository permissions; package excludes source, tests, internal docs, tasks, dependencies, and local metadata; no runtime data flow changed.
- [x] Handoff complete: verification and remaining GitHub-hosted setup are documented in `START_HERE.md`.
