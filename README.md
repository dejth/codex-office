# Codex Office

> See your local Codex sessions and subagents — privately, inside VS Code.

[![CI](https://github.com/dejth/codex-office/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/dejth/codex-office/actions/workflows/ci.yml)
[![Visual Studio Marketplace](https://vsmarketplacebadges.dev/version/dejth.codex-office.svg)](https://marketplace.visualstudio.com/items?itemName=dejth.codex-office)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Codex Office is a local-first, read-only VS Code sidebar that organizes Codex
sessions and nested subagents into an animated office. It shows only bounded
session metadata and never sends your Codex data to an external service.

![Codex Office agent room](assets/marketplace/agent-room.png)

## Start in three steps

1. Install [Codex Office from the Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=dejth.codex-office).
2. Open a folder or workspace in VS Code.
3. Select **Codex Office** in the Activity Bar.

The default view discovers persisted Codex sessions for the open workspace. It
does not require experimental settings, and sessions without a current status
are labelled `Unreported` instead of being guessed.

## What you can see

| View                       | Meaning                                                                 |
| -------------------------- | ----------------------------------------------------------------------- |
| Root and Sub cards         | Workspace sessions and verified parent/subagent relationships           |
| Working / Waiting / Failed | Basic status reported by the optional Shared observer                   |
| Idle                       | The observer reports no current work; it does not mean permanently done |
| Unreported                 | A session exists, but no safe current status was available              |
| Usage                      | Reported account-capacity windows, not billing or per-agent token use   |

Codex Office intentionally does not show prompts, responses, commands, file
contents, workspace paths, costs, or per-agent token totals.

## Compatibility

- VS Code `^1.96.0` or later is required.
- Persisted workspace inventory accepts a well-formed Codex runtime only after
  every response used by the extension passes strict, bounded validation.
- Canonical prerelease runtimes may use that inventory fallback, but are never
  treated as verified for live status.
- Codex CLI `0.146.0` is the currently schema-verified runtime.
- Experimental Shared observer live status remains limited to verified Codex
  `0.146.0`. Other compatible versions fall back to persisted inventory and
  show status as `Unreported`.
- Codex CLI and the Codex bundled with a desktop app can have different
  versions.

Check the Codex CLI visible in your terminal:

```bash
codex --version
```

On macOS, also check the retained desktop compatibility bundle when present:

```bash
/Applications/ChatGPT.app/Contents/Resources/codex --version
/Applications/Codex.app/Contents/Resources/codex --version
```

## Optional live status

Persisted inventory is the safe default. To try basic live status, enable
**Codex Office › Experimental Shared App Server**, ensure the verified local
Codex daemon is already running, and reload VS Code.

The extension never starts, stops, configures, or controls that daemon. If its
version, socket, permissions, or bounded responses cannot be verified, Codex
Office falls back to persisted inventory instead of reading more data.

## Troubleshooting

### Codex Office shows only `Unreported`

This is expected for persisted sessions that are not loaded in the verified
Shared observer. The hierarchy is still available; only live status is absent.

### Codex runtime could not be verified

Check for multiple installations. Codex Office prefers user-local executables
before the VS Code PATH and application bundles.

macOS or Linux:

```bash
codex --version
command -v codex
which -a codex
```

Windows PowerShell:

```powershell
codex --version
Get-Command codex -All | Select-Object Source
```

After updating or changing Codex, close running Codex desktop processes and use
**Developer: Reload Window** in VS Code.

### No sessions appear

- Open the same workspace folder used by the Codex sessions.
- Confirm Codex is installed and available locally.
- Run **Codex Office: Refresh** from the Command Palette.
- Open **View → Output → Codex Office** for bounded lifecycle diagnostics.

## Privacy and safety

- Local only: no telemetry, remote persistence, or extension-owned network
  calls.
- Read only: no prompting, steering, stopping, resuming, or mutating agents.
- Content blind: prompts, responses, commands, turns, files, and paths are
  discarded at the provider boundary.
- Fail safe: malformed or incompatible data keeps the last safe snapshot or
  degrades without exposing raw provider content.
- Accessible: keyboard navigation, non-color status cues, high contrast, and
  reduced motion are release requirements.

See [SECURITY.md](SECURITY.md) and the
[privacy requirements](docs/security/PRIVACY.md) for the complete policy.

## Current limitations

- Live status is basic lifecycle state, not tool-level activity.
- The Shared observer is experimental and version-verified separately from
  persisted inventory.
- Per-agent token usage is intentionally unavailable.
- Codex Office requires an open workspace and does not show global sessions.

## Install a reviewed VSIX

In VS Code, choose **Extensions: Install from VSIX…**, select the reviewed
release artifact, and open **Codex Office** from the Activity Bar.

## Develop locally

```bash
corepack enable
pnpm install
pnpm check
pnpm dev
```

Keep `pnpm dev` running, then press `F5` and choose
**Run Codex Office Extension**. The development host starts without a
workspace; use **File → Open Folder…** there when testing workspace-scoped
discovery.

## Documentation

- [Vision](docs/product/VISION.md)
- [CDD contracts](docs/cdd/README.md)
- [Architecture](docs/engineering/ARCHITECTURE.md)
- [UI/UX specification](docs/design/UI_UX_SPEC.md)
- [Development workflow](docs/engineering/DEVELOPMENT_WORKFLOW.md)
- [Marketplace publishing](docs/release/MARKETPLACE.md)
- [Agent operating model](docs/agents/MULTI_AGENT_PLAYBOOK.md)

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md), [AGENTS.md](AGENTS.md), and the nearest
nested `AGENTS.md` before making changes.

## License

MIT — see [LICENSE](LICENSE).
