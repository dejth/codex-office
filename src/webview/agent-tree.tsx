import React, { memo, useEffect, useMemo, useState } from "react";

import type { WebviewAgent } from "../protocol/webview";

const STATUS = {
  thinking: { icon: "◌", label: "Thinking" },
  reading: { icon: "⌕", label: "Reading" },
  editing: { icon: "✎", label: "Editing" },
  "running-command": { icon: ">_", label: "Running command" },
  "waiting-approval": { icon: "!", label: "Waiting for approval" },
  completed: { icon: "✓", label: "Completed" },
  failed: { icon: "×", label: "Failed" },
  idle: { icon: "·", label: "Idle" },
  unknown: { icon: "?", label: "Unknown" },
} as const;

export interface FlatTreeItem {
  id: string;
  parentId: string | null;
  firstChildId: string | null;
}

export function flattenAgentTree(
  agents: readonly WebviewAgent[],
): FlatTreeItem[] {
  const result: FlatTreeItem[] = [];
  const stack = [...agents]
    .reverse()
    .map((agent) => ({ agent, parentId: null as string | null }));
  while (stack.length > 0) {
    const { agent, parentId } = stack.pop()!;
    result.push({
      id: agent.id,
      parentId,
      firstChildId: agent.children[0]?.id ?? null,
    });
    for (let index = agent.children.length - 1; index >= 0; index -= 1) {
      stack.push({ agent: agent.children[index]!, parentId: agent.id });
    }
  }
  return result;
}

export function nextTreeFocus(
  items: readonly FlatTreeItem[],
  currentId: string,
  key: string,
): string {
  const index = items.findIndex(({ id }) => id === currentId);
  if (index < 0 || items.length === 0) return currentId;
  const current = items[index]!;
  if (key === "ArrowDown")
    return items[Math.min(index + 1, items.length - 1)]!.id;
  if (key === "ArrowUp") return items[Math.max(index - 1, 0)]!.id;
  if (key === "Home") return items[0]!.id;
  if (key === "End") return items[items.length - 1]!.id;
  if (key === "ArrowRight") return current.firstChildId ?? current.id;
  if (key === "ArrowLeft") return current.parentId ?? current.id;
  return current.id;
}

export function resolveActiveTreeId(
  items: readonly FlatTreeItem[],
  focusedId: string | null,
  selectedId: string | null,
): string | null {
  if (items.some(({ id }) => id === focusedId)) return focusedId;
  if (items.some(({ id }) => id === selectedId)) return selectedId;
  return items[0]?.id ?? null;
}

interface AgentTreeProps {
  agents: readonly WebviewAgent[];
  selectedId: string | null;
  onSelect(id: string): void;
}

export const AgentTree = memo(function AgentTree({
  agents,
  selectedId,
  onSelect,
}: AgentTreeProps): React.JSX.Element {
  const items = useMemo(() => flattenAgentTree(agents), [agents]);
  const [focusedId, setFocusedId] = useState<string | null>(selectedId);
  const activeId = resolveActiveTreeId(items, focusedId, selectedId);

  useEffect(() => {
    setFocusedId((current) => resolveActiveTreeId(items, current, selectedId));
  }, [items, selectedId]);

  const moveFocus = (currentId: string, key: string): void => {
    const targetId = nextTreeFocus(items, currentId, key);
    setFocusedId(targetId);
    document.getElementById(`treeitem-${targetId}`)?.focus();
  };

  return (
    <ul className="agent-tree" role="tree" aria-label="Codex agents">
      {agents.map((agent) => (
        <AgentBranch
          key={agent.id}
          agent={agent}
          level={1}
          activeId={activeId}
          selectedId={selectedId}
          onMoveFocus={moveFocus}
          onFocus={setFocusedId}
          onSelect={onSelect}
        />
      ))}
    </ul>
  );
});

interface AgentBranchProps {
  agent: WebviewAgent;
  level: number;
  activeId: string | null;
  selectedId: string | null;
  onMoveFocus(id: string, key: string): void;
  onFocus(id: string): void;
  onSelect(id: string): void;
}

const AgentBranch = memo(function AgentBranch({
  agent,
  level,
  activeId,
  selectedId,
  onMoveFocus,
  onFocus,
  onSelect,
}: AgentBranchProps): React.JSX.Element {
  const status = STATUS[agent.status];
  const usageLabel =
    agent.usage?.total === null || agent.usage === null
      ? "Usage unavailable"
      : `Reported usage ${agent.usage.total.toLocaleString("en-US")} tokens`;
  const select = (): void => onSelect(agent.id);

  return (
    <li
      className="agent-treeitem"
      role="treeitem"
      aria-level={level}
      aria-expanded={agent.children.length > 0 ? true : undefined}
      aria-selected={selectedId === agent.id}
      aria-label={`${agent.name}, ${status.label}, ${usageLabel}`}
      tabIndex={activeId === agent.id ? 0 : -1}
      onClick={(event) => {
        event.stopPropagation();
        select();
      }}
      onFocus={(event) => {
        event.stopPropagation();
        onFocus(agent.id);
      }}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (
          [
            "ArrowDown",
            "ArrowUp",
            "ArrowLeft",
            "ArrowRight",
            "Home",
            "End",
          ].includes(event.key)
        ) {
          event.preventDefault();
          onMoveFocus(agent.id, event.key);
        } else if (event.key === " " || event.key === "Enter") {
          event.preventDefault();
          select();
        }
      }}
      id={`treeitem-${agent.id}`}
    >
      <div className="agent-card">
        <span className="agent-identity">
          <span className="agent-avatar" aria-hidden="true">
            {level === 1 ? "◆" : "◇"}
          </span>
          <span className="agent-copy">
            <strong>{agent.name}</strong>
            <span className={`agent-status status-${agent.status}`}>
              <span aria-hidden="true">{status.icon}</span> {status.label}
            </span>
          </span>
        </span>
        <span className="usage-badge">{usageLabel}</span>
      </div>
      {agent.children.length > 0 ? (
        <ul role="group">
          {agent.children.map((child) => (
            <AgentBranch
              key={child.id}
              agent={child}
              level={level + 1}
              activeId={activeId}
              selectedId={selectedId}
              onMoveFocus={onMoveFocus}
              onFocus={onFocus}
              onSelect={onSelect}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
});
