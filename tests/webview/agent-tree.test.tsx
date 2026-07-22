import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  AgentTree,
  flattenAgentTree,
  nextTreeFocus,
  resolveActiveTreeId,
} from "../../src/webview/agent-tree";
import { previewSnapshot } from "../../src/protocol/preview-fixture";
import { replaceSnapshot } from "../../src/webview/state";

describe("accessible agent tree", () => {
  it("renders sanitized nested fixture agents with semantic tree roles", () => {
    const html = renderToStaticMarkup(
      <AgentTree
        agents={previewSnapshot.agents}
        selectedId="agent_preview_3"
        onSelect={() => undefined}
      />,
    );
    expect(html).toContain('role="tree"');
    expect(html).toContain('role="group"');
    expect(html.match(/role="treeitem"/g)).toHaveLength(4);
    expect(html).toContain("Agent 4, Completed, Usage unavailable");
    expect(html).toContain('aria-level="3"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain("Waiting for approval");
    expect(html).not.toContain("sessionId");
  });

  it("provides deterministic roving-focus navigation", () => {
    const items = flattenAgentTree(previewSnapshot.agents);
    expect(items.map(({ id }) => id)).toEqual([
      "agent_preview_1",
      "agent_preview_2",
      "agent_preview_3",
      "agent_preview_4",
    ]);
    expect(nextTreeFocus(items, "agent_preview_1", "ArrowDown")).toBe(
      "agent_preview_2",
    );
    expect(nextTreeFocus(items, "agent_preview_1", "ArrowRight")).toBe(
      "agent_preview_2",
    );
    expect(nextTreeFocus(items, "agent_preview_4", "ArrowLeft")).toBe(
      "agent_preview_3",
    );
    expect(nextTreeFocus(items, "agent_preview_2", "End")).toBe(
      "agent_preview_4",
    );
    expect(nextTreeFocus(items, "agent_preview_4", "ArrowDown")).toBe(
      "agent_preview_4",
    );
    expect(
      resolveActiveTreeId(items, "agent_preview_3", "agent_preview_1"),
    ).toBe("agent_preview_3");
    expect(resolveActiveTreeId(items, "removed", "agent_preview_2")).toBe(
      "agent_preview_2",
    );
  });

  it("uses one tab stop and exposes icon-plus-text status cues", () => {
    const html = renderToStaticMarkup(
      <AgentTree
        agents={previewSnapshot.agents}
        selectedId={null}
        onSelect={() => undefined}
      />,
    );
    expect(html.match(/tabindex="0"/g)).toHaveLength(1);
    expect(html.match(/tabindex="-1"/g)).toHaveLength(3);
    expect(html.match(/aria-expanded="true"/g)).toHaveLength(2);
    for (const status of [
      "Editing",
      "Reading",
      "Waiting for approval",
      "Completed",
    ])
      expect(html).toContain(status);
  });

  it("replaces previous agents with an authoritative empty snapshot", () => {
    const empty = { ...previewSnapshot, id: "snapshot_empty", agents: [] };
    expect(replaceSnapshot(previewSnapshot, empty)).toBe(empty);
    expect(replaceSnapshot(previewSnapshot, empty).agents).toEqual([]);
  });
});
