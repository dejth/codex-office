import type { WebviewSnapshot } from "./webview";

/** Sanitized, deterministic preview data. It contains no provider/session data. */
export const previewSnapshot: WebviewSnapshot = {
  id: "snapshot_preview",
  updatedAt: "2026-01-01T00:00:00.000Z",
  connection: "disconnected",
  rateLimits: {
    primary: {
      usedPercent: 38,
      windowDurationMinutes: 300,
      resetsAt: "2026-01-01T04:00:00.000Z",
    },
    secondary: {
      usedPercent: 62,
      windowDurationMinutes: 10_080,
      resetsAt: "2026-01-05T00:00:00.000Z",
    },
    provenance: "reported",
  },
  unresolved: [],
  agents: [
    {
      id: "agent_preview_1",
      name: "Agent 1",
      status: "editing",
      usage: {
        input: 820,
        cachedInput: 240,
        output: 220,
        total: 1_280,
        provenance: "reported",
      },
      children: [
        {
          id: "agent_preview_2",
          name: "Agent 2",
          status: "reading",
          usage: null,
          children: [],
        },
        {
          id: "agent_preview_3",
          name: "Agent 3",
          status: "waiting-approval",
          usage: {
            input: 320,
            cachedInput: null,
            output: 80,
            total: 400,
            provenance: "reported",
          },
          children: [
            {
              id: "agent_preview_4",
              name: "Agent 4",
              status: "completed",
              usage: {
                input: 160,
                cachedInput: 40,
                output: 60,
                total: 260,
                provenance: "derived",
              },
              children: [],
            },
          ],
        },
      ],
    },
  ],
};
