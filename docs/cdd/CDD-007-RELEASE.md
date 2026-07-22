# CDD-007 — Release Contract

Status: Draft

A release is eligible only when CI is green, version/changelog agree, VSIX installs in a clean profile, permissions and package contents are reviewed, privacy copy is accurate, and a human approves publication.

Marketplace publishing is intentionally manual at first. Automation may build and attach a VSIX, but must not publish without an environment approval and protected secret.

Required artifacts: `.vsix`, SHA-256 checksum, changelog entry, test summary, compatibility statement, screenshots, and rollback note.
