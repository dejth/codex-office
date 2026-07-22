# Start Here

Before the first commit:

1. [x] Set the GitHub owner to `dejth` in package metadata.
2. [x] Set the Marketplace publisher ID to `dejth`.
3. [x] Confirm the copyright name in `LICENSE`.
4. [ ] Enable private vulnerability reporting and configure branch protection/CODEOWNERS on GitHub.
5. [ ] Create a GitHub Project using `docs/product/PROJECT_BOARD.md` and seed the listed issues.
6. [x] Run `corepack enable`, `pnpm install`, and `pnpm check`.
7. [ ] Commit the foundation before starting provider research.

The first engineering task is issue 1: verify the current Codex interface and token semantics. Do not implement the parser from assumptions or the untrusted referenced conversation.
