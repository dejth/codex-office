# CDD-001 — Product Contract

Status: Accepted for v0.1 planning

## User

A developer running Codex locally who wants an immediate, friendly view of agent activity and honest usage information inside VS Code.

## Outcomes

- See main and nested subagents in one sidebar.
- Understand whether each agent is working, waiting, finished, failed, or unknown.
- See animated agents and compact local account capacity in one sidebar.
- Inspect reported per-thread usage and its provenance.
- Keep sensitive activity on-device.

## v0.1 scope

Activity Bar container, unified sidebar webview, hierarchy, basic state
mapping, reported account capacity, agent selection, empty/degraded states,
local settings, fixtures, and VSIX packaging.

## Non-goals

Controlling agents, sending prompts, reproducing the Codex UI, exact billing/quota, team surveillance, cloud sync, other AI providers, gamification economy, or guaranteed protocol compatibility across untested Codex versions.

## Success signals

- First useful render within two seconds of receiving a provider snapshot.
- No external network requests in normal operation.
- Nested hierarchy and status remain understandable without animation or color.
- A user can explain what `reported usage` means from the UI copy.
