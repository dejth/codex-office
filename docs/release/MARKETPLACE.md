# VS Code Marketplace Publishing

## One-time owner setup

1. Create/choose a Microsoft Marketplace publisher ID.
2. Replace `publisher` in `package.json`; confirm extension name availability.
3. Complete publisher profile, support links, repository URL, icon, banner, README screenshots, license, privacy statement, and categories.
4. Create the least-privileged Azure DevOps/Marketplace token required by current official instructions; store it only as a protected GitHub environment secret.
5. Protect the `marketplace` environment with human approval.

Because Marketplace requirements can change, verify the
[current official VS Code publishing documentation](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
before the first real publication. The 0.1.0 beta candidate uses publisher ID
`dejth`, but the Marketplace portal must still confirm that publisher identity
and the `codex-office` extension-name availability.

## Beta path

Package locally with `pnpm package`, inspect archive contents, install the VSIX in a clean profile, validate commands/sidebar/theme/accessibility, then publish manually or approve the release workflow.

## Listing checklist

Clear value proposition; sanitized production-UI screenshot; privacy
statement; compatibility; known limitations; no billing or per-agent-token
claim; changelog; support/security links; license/attribution; verified install
instructions. Marketplace icons must be packaged PNG files, not SVG.

## Rollback

Prepare a patch first. If a release creates privacy/security risk, remove/deprecate it through Marketplace controls, publish advisory guidance, rotate any exposed secret, and document the incident.
