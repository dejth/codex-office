# Task: Prepare Marketplace beta 0.1.0

Status: Complete
Owner: Dex
Governing contract: CDD-007
Depends on: Task 047

## Context

Prepare an honest, reproducible Marketplace beta candidate after the maintainer
approved the live shared-observer UI. Publication remains a separate explicit
human gate.

## Owned files

- public package metadata and README
- Marketplace PNG assets and listing screenshots
- release documentation and validation evidence
- packaging/release tests as needed
- changelog and this task

## Explicit non-goals

- Publishing, tagging, creating Marketplace credentials, or mutating publisher state.
- Claiming per-agent token usage or billing accuracy.
- Claiming compatibility with an untested VS Code or Codex version.

## Acceptance criteria

- [x] Public copy accurately describes live status, account capacity, privacy, and limitations.
- [x] Package metadata is valid for beta 0.1.0 and includes a PNG listing icon.
- [x] Current screenshots contain no source, paths, prompts, chats, or private session content.
- [x] Candidate VSIX, checksum, package audit, and clean-profile evidence are reproducible.
- [x] Release checklist records passed, pending, and human-only gates honestly.

## Verification

- [x] Targeted release tests
- [x] `pnpm check`
- [x] VSIX package and budget audit
- [x] Clean-profile lifecycle
- [x] Privacy/security impact recorded
- [x] Handoff complete

## Post-publication result

- [x] Maintainer reviewed and explicitly approved Marketplace publication.
- [x] `dejth.codex-office` version `0.1.0` is publicly available.
- [x] PR #59 promoted the reviewed release source to `main` after CI passed.
- [x] Marketplace icon, preview image, README, and repository links render from
      the default branch.
