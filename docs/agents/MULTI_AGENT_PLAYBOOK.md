# Multi-Agent Playbook

## Roles

- **Coordinator:** decomposes, assigns file ownership, sequences integration, tracks risks, and makes handoffs legible.
- **Protocol researcher:** verifies current Codex protocol and produces sanitized fixtures/evidence; does not implement from assumptions.
- **Provider engineer:** validates and normalizes Codex events.
- **Domain/usage engineer:** owns hierarchy, status model, provenance, and accounting.
- **Extension engineer:** owns activation, lifecycle, storage, CSP, and webview bridge.
- **UI/animation engineer:** owns Office, Meter, Inspector, accessibility, and asset pipeline.
- **Test/review agent:** independently tests acceptance criteria and reports findings; read-only by default.
- **Release agent:** packages and audits artifacts; cannot publish without human approval.

## Standard orchestration

1. Coordinator reads the request, CDDs, and current state.
2. Create a dependency graph and parallelize only independent leaf tasks.
3. Give each agent a task prompt, acceptance criteria, owned files, forbidden actions, and required evidence.
4. Agents post concise status at meaningful boundaries and hand off using the template.
5. Coordinator integrates contract changes before dependent implementations.
6. Review agent checks the merged result independently.
7. Release agent runs gates; human approves external publication.

## Recommended lanes

Protocol research and UI fixture prototyping can run in parallel. Domain contracts precede provider mapping and real UI data flow. Extension bridge follows message contract. Release documentation/automation can run independently but publication waits for all quality gates.

## Collision prevention

Maintain one owner per file for active work. Shared contract edits are serialized. If an agent discovers cross-lane work, it records a follow-up instead of expanding scope silently.

## Escalation

Stop and ask the coordinator when evidence conflicts, protocol semantics are unknown, privacy scope expands, a destructive/external action is needed, or acceptance criteria cannot be met without changing the contract.
