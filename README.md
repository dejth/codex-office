# Codex Office

> Watch your Codex agents work. Understand where the tokens go.

Codex Office is a privacy-first VS Code extension that visualizes Codex main agents and nested subagents in an animated sidebar, with a meter view for reported token usage.

## Status

This repository is a production-minded starter kit. The UI and provider integration are intentionally minimal; product decisions, contracts, test fixtures, agent workflows, and release gates are documented before implementation begins.

## Product principles

- Codex-first and local-first.
- Read-only observer before control features.
- Report telemetry honestly; never present estimates as billing facts.
- Accessible even when animation is disabled.
- Provider/domain/UI boundaries must stay independently testable.

## Quick start

```bash
corepack enable
pnpm install
pnpm check
pnpm dev
```

Keep `pnpm dev` running, then press `F5` in VS Code and choose
**Run Codex Office Extension** if prompted. The checked-in launch configuration
loads the current workspace build in an Extension Development Host regardless
of the active editor. Open **Codex Office** in the Activity Bar. The development
host starts without a workspace; use **File → Open Folder…** there when testing
workspace-scoped discovery.

## Documentation map

- [Vision](docs/product/VISION.md)
- [CDD index](docs/cdd/README.md)
- [Architecture](docs/engineering/ARCHITECTURE.md)
- [UI/UX specification](docs/design/UI_UX_SPEC.md)
- [Roadmap](docs/product/ROADMAP.md)
- [Development workflow](docs/engineering/DEVELOPMENT_WORKFLOW.md)
- [Marketplace publishing](docs/release/MARKETPLACE.md)
- [Agent operating model](docs/agents/MULTI_AGENT_PLAYBOOK.md)

## Privacy

Codex Office must not send source code, prompts, transcript content, workspace paths, or usage data off-device. See [SECURITY.md](SECURITY.md) and [privacy requirements](docs/security/PRIVACY.md).

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md), [AGENTS.md](AGENTS.md), and the nearest nested `AGENTS.md` before making changes.

## License

MIT — see [LICENSE](LICENSE).
