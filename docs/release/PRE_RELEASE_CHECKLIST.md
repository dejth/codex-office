# Pre-release Checklist

- [x] Scope matches the 0.1.0 beta changelog and accepted product contracts.
- [x] Declared-minimum VS Code 1.96.4 and current VS Code 1.130.0 isolated
      lifecycle checks pass on macOS arm64.
- [x] Provider compatibility evidence is current for Codex CLI 0.145.0.
- [x] Usage labels and provenance avoid per-agent token and billing claims.
- [x] Privacy, dependency, CSP, and package-content reviews pass.
- [x] Accessibility and reduced-motion checks pass.
- [x] VSIX installs, disables, uninstalls, and leaves no extension behind in a
      fresh isolated profile.
- [x] README, sanitized listing screenshot, and limitations are current.
- [x] Version 0.1.0, candidate filename, and SHA-256 checksum agree; no tag has
      been created.
- [x] Rollback owner and manual first-release path are recorded.
- [x] Publisher identity and extension-name availability are confirmed in the
      Marketplace portal.
- [x] Human explicitly approves Marketplace publication.

Published as `dejth.codex-office` version `0.1.0` on 2026-07-27. Production
source was promoted from `develop` to `main` in PR #59 after CI passed.
