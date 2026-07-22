# Contract-Driven Development Index

CDD makes behavior, ownership, boundaries, and evidence explicit before implementation. Each contract is small enough for one agent to own and must be updated when behavior changes.

| ID      | Contract                                        | Primary owner  | Exit evidence                   |
| ------- | ----------------------------------------------- | -------------- | ------------------------------- |
| CDD-001 | [Product contract](CDD-001-PRODUCT.md)          | Product        | Accepted scope and non-goals    |
| CDD-002 | [Domain model](CDD-002-DOMAIN.md)               | Domain         | Fixture-backed model tests      |
| CDD-003 | [Webview protocol](CDD-003-WEBVIEW-PROTOCOL.md) | Extension + UI | Schema and contract tests       |
| CDD-004 | [Codex provider](CDD-004-CODEX-PROVIDER.md)     | Provider       | Recorded sanitized fixtures     |
| CDD-005 | [Usage accounting](CDD-005-USAGE.md)            | Usage          | Deduplication test matrix       |
| CDD-006 | [Office UI](CDD-006-OFFICE-UI.md)               | UI             | Visual and accessibility QA     |
| CDD-007 | [Release](CDD-007-RELEASE.md)                   | Release        | Reproducible VSIX and checklist |

## Contract lifecycle

`Draft → Accepted → Implemented → Verified → Changed/Superseded`

Contract changes that affect privacy, provider protocol, persistence, public configuration, or marketplace permissions require an ADR in `docs/decisions/`.
