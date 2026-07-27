# Agent Handoff

- Task / owner: Task 048 / Dex
- Outcome: Prepared a truthful, reproducible Marketplace beta 0.1.0 candidate.
  The maintainer later reviewed it, explicitly approved manual publication,
  and promoted the reviewed source to `main` through PR #59.
- Files changed: Package metadata, public README and changelog, deterministic
  Marketplace assets/preview source, release validation/checklist, checksum,
  release metadata test, and Task 048.
- Contract decisions: Public copy claims workspace inventory, basic opt-in live
  status, and reported account capacity only. It explicitly excludes billing,
  cost, control actions, and per-agent token totals.
- Verification performed and result: `pnpm check` passed 25 files / 223 tests;
  `pnpm audit --prod` reported no known vulnerabilities; VSIX budget/content
  audit passed at 687,755 bytes and 24 files; isolated install/disable/uninstall
  lifecycle passed on VS Code 1.96.4 and 1.130.0; SHA-256 is recorded alongside
  the candidate.
- Privacy/security impact: No new runtime network or persistence behavior. The
  listing screenshot is generated from a synthetic fixture and contains no
  prompt, path, chat, identity, or real usage data.
- Known limitations: Upgrade from a genuine older release remains untested.
  Per-agent token usage remains unavailable because the accepted content-free
  observer does not report it.
- Follow-ups / dependencies: Track a privacy-safe per-agent usage capability
  only if upstream exposes a supported content-free API.
- Exact reviewer reproduction steps: Run `pnpm check`, package
  `artifacts/codex-office-0.1.0.vsix`, run the budget checker with `--vsix`, run
  the clean-profile smoke script, and compare `shasum -a 256` with the checked-in
  checksum.
