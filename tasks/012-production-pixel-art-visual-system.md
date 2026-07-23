# Task: Replace Office mock with production pixel-art visual system

Status: Complete
Owner: Coordinator (Dex) with visual and review agents
Governing contract: CDD-001, CDD-006
Depends on: Issues #7 and #8

## Context

Issue #19 replaces the code-native proof-of-concept figures with a distinctive local pixel-art system suitable for the v0.1 product and later Marketplace screenshots.

## Owned files

- `assets/office/` — Coordinator
- `assets/ATTRIBUTION.md` — Coordinator
- `docs/design/OFFICE_VISUAL_SYSTEM.md` — Coordinator
- `src/webview/office-view.tsx` — Coordinator
- `src/webview/styles.css` — Coordinator
- `tests/webview/office-view.test.tsx` — Coordinator
- `tests/webview/visual-assets.test.ts` — Coordinator
- `docs/cdd/CDD-006-OFFICE-UI.md` — Coordinator
- `CHANGELOG.md` — Coordinator
- `tasks/012-production-pixel-art-visual-system.md` — Coordinator

## Explicit non-goals

- Remote assets, runtime image generation, or executable asset formats.
- Marketplace listing media or publication.
- Replacing accessible text/status/tree behavior with imagery.
- Live provider integration from Issue #9.

## Acceptance criteria

- [x] Document palette, scale, grid, asset conventions, and local license/source metadata.
- [x] Replace prototype figures/furniture with production pixel-art characters and station treatments for all statuses.
- [x] Preserve hierarchy, selection, readable status cues, narrow width, themes, zoom, high contrast, and reduced motion.
- [x] Establish deterministic visual baselines and asset-size/performance budgets for Issue #9.

## Verification

- [x] Generated assets inspected visually
- [x] Targeted visual/UI/accessibility tests
- [x] `pnpm check`
- [x] Privacy/security impact recorded
- [x] Handoff complete

## Handoff

- Task / owner: Issue #19 / Coordinator (Dex)
- Outcome: Replaced CSS placeholder figures with nine local production
  pixel-art characters and established deterministic asset baselines.
- Files changed: Office assets and manifest, webview presentation/build,
  visual tests, CDD/design/attribution/changelog, packaging exclusions.
- Contract decisions: Images remain decorative; readable status and hierarchy
  are authoritative. Raw generation sources remain in Git but not the VSIX.
- Verification performed and result: visual montage inspected; independent
  read-only review completed and all three findings resolved; `pnpm check`
  passed with 12 files and 128 tests; VSIX packaged with 22 files at 215.01 KB
  and only nine hashed runtime PNGs.
- Privacy/security impact: No network access, telemetry, persistence, provider
  scope, user content, or filesystem access was added to the webview.
- Known limitations: Baselines validate source pixels, dimensions, identity,
  and size; cross-theme screenshot regression belongs to Issue #9.
- Follow-ups / dependencies: Issue #9 consumes the manifest for visual
  regression and clean-profile smoke coverage.
- Exact reviewer reproduction steps: run `pnpm check`; run
  `pnpm exec vsce package --out /tmp/codex-office.vsix`; inspect
  `unzip -l /tmp/codex-office.vsix`.
