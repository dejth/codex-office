# Task: Verify current stable Codex shared status compatibility

Status: Verified
Owner: Coordinator (Dex)
Governing contract: CDD-004
Depends on: Task 036, ADR-0005

## Scope

Verify the current stable Codex CLI against the exact metadata-only Shared App
Server
contract, add it to the runtime allowlist only when schemas and sanitized live
behavior remain compatible, and explain root/subagent classification without
guessing missing hierarchy.

## Owned files

- `src/providers/codex/capabilities.ts`
- provider capability/provider tests and sanitized evidence
- `docs/decisions/ADR-0005-OPT-IN-SHARED-APP-SERVER-STATUS.md`
- `docs/cdd/CDD-004-CODEX-PROVIDER.md`
- `CHANGELOG.md`
- this task

## Non-goals

- Treating separate root sessions as subagents.
- Inferring parent edges from time, display order, process ownership, or names.
- Reading prompts, turns, commands, file contents, or raw identifiers.
- Supporting the alpha Codex binaries bundled with GUI applications.

## Acceptance criteria

- Generated 0.145.0 schemas retain every request, field, and enum used by the
  adapter.
- Sanitized live evidence distinguishes real roots from verified subagent
  edges.
- Runtime negotiation accepts only the separately evidenced stable versions.
- Existing malformed and unsupported fingerprints still fail closed.
- The managed daemon and CLI versions match for reviewer testing.
- `pnpm check`, package validation, and VSIX installation pass.

## Evidence summary

- The terminal initially used 0.144.3 while the managed daemon remained on
  0.138.0. The supported standalone installation and daemon were updated
  through the official updater to 0.145.0.
- Generated 0.145.0 schemas retain `thread/list`, `thread/loaded/list`,
  metadata-only `thread/read`, `account/rateLimits/read`, canonical and
  spawn-source parent fields, and every accepted basic status enum.
- A sanitized workspace probe found 21 `vscode` root sessions, zero canonical
  parent edges, zero spawn-source parent edges, and zero generated subagent
  nicknames. The product must present these as roots rather than inventing a
  hierarchy.
- The 0.145.0 Unix endpoint accepts the standard logical
  `ws://localhost/rpc` handshake over an explicitly supplied Unix connection.
  The previous `ws+unix:` URL shortcut is not compatible with this release.

## Handoff

- Outcome: Updated the exact runtime gate and Shared App Server transport for
  stable Codex 0.145.0, and renamed top-level card provenance from `Main` to
  `Root`.
- Contract decisions: parentless sessions remain roots; only canonical or
  spawn-source parent evidence creates subagents; alpha GUI binaries remain
  unsupported.
- Verification: generated schemas, sanitized live metadata probe, 209 tests,
  full `pnpm check`, VSIX package validation, installation, and matching
  CLI/daemon version all passed.
- Privacy/security impact: no new data fields are retained; the socket remains
  owner-only `0600`; the observer still strips everything except bounded
  identifier and status.
- Known limitations: independent historical VS Code root sessions remain
  visible as roots; detailed editing/tool activity and per-thread usage remain
  unavailable.
- Reviewer reproduction:
  1. Reload VS Code after installing the VSIX.
  2. Keep `codexOffice.experimentalSharedAppServer` enabled.
  3. Run `codex --remote unix://` from this workspace and start a task.
  4. Confirm the new root card moves from active to idle/failed without
     relabeling unrelated root sessions as subagents.
