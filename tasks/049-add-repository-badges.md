# Task: Add trustworthy repository badges

Status: Complete
Owner: Dex
Governing contract: CDD-001
Depends on: None

## Context

Add concise, current badges to the GitHub README using the repository's real
CI workflow, Marketplace listing, and MIT license.

## Owned files

- `README.md`
- this task

## Explicit non-goals

- Adding vanity metrics that do not help users assess the project.
- Changing CI behavior, licensing terms, or legal attribution.

## Acceptance criteria

- [x] README links to the active `ci.yml` workflow on `main`.
- [x] README links to the live Marketplace listing with a current version badge.
- [x] README displays the existing MIT license accurately.
- [x] Every badge endpoint resolves successfully.

## Verification

- [x] Badge URL checks
- [x] `pnpm check`
- [x] Privacy/security impact recorded
- [x] Handoff complete

No telemetry, application network call, runtime permission, license term, or
legal attribution changed. The badge images are fetched only by README viewers.
