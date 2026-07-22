# UI/UX Specification

## Information architecture

One Activity Bar container contains one sidebar view with two primary modes: **Office** and **Meter**. Selecting an agent opens an Inspector within the same view. Settings use VS Code settings.

## Office

- Room overview preserves hierarchy through grouping, connectors, or zones.
- Main agent is visually primary; nested children remain traceable to parents.
- Each character exposes name, status, task summary when safe, usage badge, and accessible label.
- Dense teams collapse by branch and offer a list fallback.

## Meter

- Header: connection, snapshot age, active/completed counts.
- Summary: main, subagents, total reported usage.
- Tree rows: name, status, total, expandable components.
- Unknown/missing values use `—`, not `0`.
- Provenance explanation is one click away.

## Core states

First run, connected-empty, active, waiting approval, completed, degraded, disconnected, unsupported Codex version, permission/read failure, and stale data.

## Visual language

Use VS Code theme tokens for chrome/text. Pixel art provides personality but must retain contrast in light, dark, and high-contrast themes. Status uses icon + word + color.

## Interaction

Mode toggle is keyboard reachable and uses pressed state. Agent cards/rows use button semantics. Escape returns from Inspector. Refresh does not erase the last safe snapshot.

## Copy

Say `Reported usage`, not `cost`. Say `Codex Office cannot read this session`, not `No tokens`. Explain uncertainty directly and briefly.
