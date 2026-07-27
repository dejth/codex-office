# CDD-007 — Release Contract

Status: Verified

A release is eligible only when CI is green, version/changelog agree, VSIX installs in a clean profile, permissions and package contents are reviewed, privacy copy is accurate, and a human approves publication.

Marketplace publishing is intentionally manual at first. Automation may build and attach a VSIX, but must not publish without an environment approval and protected secret.

Required artifacts: `.vsix`, SHA-256 checksum, changelog entry, test summary, compatibility statement, screenshots, and rollback note.

Issue #9 adds deterministic bundle/package budgets and an isolated-profile
install, disable, and uninstall harness. Passing these engineering gates does
not make a release eligible by itself; minimum-version, visual matrix, upgrade,
artifact, and human publication gates remain recorded in
`docs/release/V0.1_VALIDATION.md`.

The 0.1.0 release completed these gates on 2026-07-27 and was published
manually as `dejth.codex-office` after explicit maintainer approval. This
verification does not authorize future releases.
