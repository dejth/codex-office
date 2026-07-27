import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { previewSnapshot } from "../../src/protocol/preview-fixture";
import type { WebviewAgent } from "../../src/protocol/webview";
import {
  filterOfficeAgentGroups,
  nextOfficeFocusId,
  OfficeView,
  orderOfficeAgents,
} from "../../src/webview/office-view";

const allStatuses: WebviewAgent["status"][] = [
  "thinking",
  "reading",
  "editing",
  "running-command",
  "waiting-approval",
  "completed",
  "failed",
  "idle",
  "unknown",
];

describe("Office view", () => {
  it("filters root-only Unreported sessions out of Working", () => {
    const unreportedRoots: WebviewAgent[] = ["root-1", "root-2"].map((id) => ({
      id,
      name: id,
      status: "unknown",
      lastActivityAt: "2026-01-01T00:00:00.000Z",
      usage: null,
      children: [],
    }));

    expect(filterOfficeAgentGroups(unreportedRoots, "working")).toEqual([]);
    expect(filterOfficeAgentGroups(unreportedRoots, "unreported")).toEqual(
      unreportedRoots,
    );
  });

  it("retains a complete root group when one descendant matches", () => {
    const activeChild: WebviewAgent = {
      id: "active-child",
      name: "Active child",
      status: "editing",
      lastActivityAt: "2026-01-01T01:00:00.000Z",
      usage: null,
      children: [],
    };
    const root: WebviewAgent = {
      id: "unreported-root",
      name: "Root",
      status: "unknown",
      lastActivityAt: null,
      usage: null,
      children: [activeChild],
    };

    expect(filterOfficeAgentGroups([root], "working")).toEqual([root]);
  });

  it("orders active groups first and reported activity newest first", () => {
    const makeAgent = (
      id: string,
      status: WebviewAgent["status"],
      lastActivityAt: string | null,
      children: WebviewAgent[] = [],
    ): WebviewAgent => ({
      id,
      name: id,
      status,
      lastActivityAt,
      usage: null,
      children,
    });
    const ordered = orderOfficeAgents([
      makeAgent("inactive-new", "idle", "2026-01-01T05:00:00.000Z"),
      makeAgent("active-old", "thinking", "2026-01-01T02:00:00.000Z"),
      makeAgent("active-new", "editing", "2026-01-01T04:00:00.000Z"),
      makeAgent("unreported", "unknown", "2026-01-01T06:00:00.000Z"),
    ]);

    expect(ordered.map(({ id }) => id)).toEqual([
      "active-new",
      "active-old",
      "inactive-new",
      "unreported",
    ]);
  });

  it("keeps parent groups together and promotes a group with active children", () => {
    const child: WebviewAgent = {
      id: "active-child",
      name: "Active child",
      status: "running-command",
      lastActivityAt: "2026-01-01T03:00:00.000Z",
      usage: null,
      children: [],
    };
    const ordered = orderOfficeAgents([
      {
        id: "idle-root",
        name: "Idle root",
        status: "idle",
        lastActivityAt: "2026-01-01T05:00:00.000Z",
        usage: null,
        children: [],
      },
      {
        id: "active-group",
        name: "Active group",
        status: "unknown",
        lastActivityAt: null,
        usage: null,
        children: [child],
      },
    ]);

    expect(ordered.map(({ id }) => id)).toEqual(["active-group", "idle-root"]);
    expect(ordered[0]?.children.map(({ id }) => id)).toEqual(["active-child"]);
  });

  it("renders deterministic stations from sanitized agent statuses", () => {
    const html = renderToStaticMarkup(
      <OfficeView
        agents={previewSnapshot.agents}
        reducedMotion={false}
        selectedId="agent_preview_3"
        onSelect={() => undefined}
        connection="connected"
        statusSource="shared-observer"
      />,
    );

    expect(html.match(/class="office-station"/g)).toHaveLength(4);
    expect(html).toContain("Writing desk");
    expect(html).toContain("Reading nook");
    expect(html).toContain("Approval desk");
    expect(html).toContain("Celebration corner");
    expect(html).toContain('data-motion="typing-loop"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("1 Roots · 3 Subs");
    expect(html).toContain("4 shown · 4 sessions");
    expect(html).toContain("Shared observer");
    expect(html).toContain('aria-label="Filter agents"');
    expect(html).toContain("Unreported 0");
    expect(html.match(/tabindex="0"/g)).toHaveLength(1);
    expect(html.match(/tabindex="-1"/g)).toHaveLength(3);
    expect(html.match(/data-root="true"/g)).toHaveLength(1);
    expect(html.match(/data-root="false"/g)).toHaveLength(3);
    expect(html).toContain('<span class="station-sign">Root</span>');
    expect(html).toContain('<span class="station-sign">Sub</span>');
    expect(html).toContain('aria-label="Agent 1, Editing, Writing desk"');
    expect(html).not.toContain(">CO<");
    expect(html).not.toContain("09:41");
    expect(html).not.toContain("sessionId");
  });

  it("counts agents whose detailed status is not reported", () => {
    const html = renderToStaticMarkup(
      <OfficeView
        agents={[
          {
            id: "main",
            name: "Main",
            status: "unknown",
            usage: null,
            children: [
              {
                id: "sub",
                name: "Sub",
                status: "unknown",
                usage: null,
                children: [],
              },
            ],
          },
        ]}
        reducedMotion
        selectedId={null}
        onSelect={() => undefined}
        connection="connected"
      />,
    );

    expect(html).toContain("Unreported 2");
    expect(html).toContain('<span class="sr-only">Unreported</span>');
    expect(html).toContain('aria-label="Main, Unreported, Observation point"');
  });

  it("collapses large Unreported-only groups behind an accessible summary", () => {
    const agents = Array.from({ length: 7 }, (_, index): WebviewAgent => ({
      id: `unreported-${index}`,
      name: `Agent ${index}`,
      status: "unknown",
      lastActivityAt: null,
      usage: null,
      children: [],
    }));
    const html = renderToStaticMarkup(
      <OfficeView
        agents={agents}
        reducedMotion
        selectedId={null}
        onSelect={() => undefined}
        connection="connected"
        statusSource="shared-observer"
      />,
    );

    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("Other sessions");
    expect(html).toContain("7 Unreported · Show");
    expect(html).toContain("0 shown · 7 sessions");
    expect(html).not.toContain('class="office-station"');
  });

  it("provides one roving tab stop with deterministic arrow navigation", () => {
    const ids = ["main", "sub-1", "sub-2"];
    expect(nextOfficeFocusId(ids, "main", "ArrowRight")).toBe("sub-1");
    expect(nextOfficeFocusId(ids, "sub-1", "ArrowDown")).toBe("sub-2");
    expect(nextOfficeFocusId(ids, "sub-2", "ArrowLeft")).toBe("sub-1");
    expect(nextOfficeFocusId(ids, "main", "ArrowUp")).toBe("main");
    expect(nextOfficeFocusId(ids, "sub-1", "Home")).toBe("main");
    expect(nextOfficeFocusId(ids, "main", "End")).toBe("sub-2");
  });

  it("maps every status to a production pixel character", () => {
    const agents = allStatuses.map<WebviewAgent>((status, index) => ({
      id: `agent_${index}`,
      name: `Agent ${index}`,
      status,
      lastActivityAt: null,
      usage: null,
      children: [],
    }));
    const html = renderToStaticMarkup(
      <OfficeView
        agents={agents}
        reducedMotion={false}
        selectedId={null}
        onSelect={() => undefined}
        connection="connected"
      />,
    );

    for (const status of allStatuses) {
      expect(html).toContain(`pixel-character-${status}`);
    }
    expect(html.match(/class="pixel-character /g)).toHaveLength(9);
  });

  it("renders static presentation states when reduced motion is enabled", () => {
    const html = renderToStaticMarkup(
      <OfficeView
        agents={previewSnapshot.agents}
        reducedMotion
        selectedId={null}
        onSelect={() => undefined}
        connection="connected"
      />,
    );

    expect(html).toContain('data-reduced-motion="true"');
    expect(html.match(/data-motion="none"/g)).toHaveLength(4);
    expect(html).not.toContain('data-transition="crossfade"');
  });

  it.each([
    ["connected", "No Codex sessions found", "pixel-character-idle"],
    ["degraded", "Codex provider unavailable", "pixel-character-failed"],
    ["disconnected", "Waiting for Codex provider", "pixel-character-unknown"],
  ] as const)(
    "renders an honest, readable %s empty state",
    (connection, heading, character) => {
      const html = renderToStaticMarkup(
        <OfficeView
          agents={[]}
          reducedMotion
          selectedId={null}
          onSelect={() => undefined}
          connection={connection}
        />,
      );

      expect(html).toContain(`<h2>${heading}</h2>`);
      expect(html).toContain(character);
      expect(html).toContain('aria-hidden="true"');
      expect(html).not.toContain("Synthetic data");
      expect(html).not.toContain("Live office preview");
      expect(html).not.toContain('aria-label="Visual agent office"');
      expect(html).toContain('data-reduced-motion="true"');
    },
  );

  it("animates empty-state sprites unless reduced motion is enabled", () => {
    const animated = renderToStaticMarkup(
      <OfficeView
        agents={[]}
        reducedMotion={false}
        selectedId={null}
        onSelect={() => undefined}
        connection="disconnected"
      />,
    );
    const staticView = renderToStaticMarkup(
      <OfficeView
        agents={[]}
        reducedMotion
        selectedId={null}
        onSelect={() => undefined}
        connection="disconnected"
      />,
    );

    expect(animated).toContain('data-reduced-motion="false"');
    expect(staticView).toContain('data-reduced-motion="true"');
  });

  it("labels populated production data without calling it synthetic or live", () => {
    const html = renderToStaticMarkup(
      <OfficeView
        agents={previewSnapshot.agents}
        reducedMotion
        selectedId={null}
        onSelect={() => undefined}
        connection="connected"
      />,
    );

    expect(html).toContain("Codex workspace");
    expect(html).toContain("1 Roots · 3 Subs");
    expect(html).not.toContain("Synthetic data");
    expect(html).not.toContain("Live office preview");
  });
});
