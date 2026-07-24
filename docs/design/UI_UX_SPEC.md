# UI/UX Specification

## Information architecture

One Activity Bar container contains one compact sidebar. Local account capacity
and hierarchy counts appear above the animated Office. Selecting an agent stays
within the same view. Settings use VS Code settings.

## Office

- Room overview preserves hierarchy through grouping, connectors, or zones.
- Root sessions use a subtle blue background and readable `Main` label; all
  characters and cards otherwise share one compact footprint.
- Each character exposes name, status, task summary when safe, usage badge, and accessible label.
- Dense teams collapse by branch and offer a list fallback.

## Account overview

- Compact reported account windows show percentage, reset time, and
  `not billing data`.
- Summary shows root sessions, subagents, and visible thread count.
- Per-thread values remain hidden when unavailable.

## Core states

First run, connected-empty, active, waiting approval, completed, degraded, disconnected, unsupported Codex version, permission/read failure, and stale data.

## Visual language

Use VS Code theme tokens for chrome/text. Pixel art provides personality but must retain contrast in light, dark, and high-contrast themes. Status uses icon + word + color.

## Interaction

Agent cards use button semantics and one roving tab stop. Refresh does not erase
the last safe snapshot.

## Copy

Say `Reported usage`, not `cost`. Say `Codex Office cannot read this session`, not `No tokens`. Explain uncertainty directly and briefly.
