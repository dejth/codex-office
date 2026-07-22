import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

interface EvidenceFixture {
  threads: Array<{
    id: string;
    sessionId: string;
    parentThreadId: string | null;
  }>;
  notificationScenarios: Array<{
    scenario: string;
    notification: {
      method: string;
      params: {
        threadId: string;
        turnId: string;
        tokenUsage: {
          total: { totalTokens: number };
          last: { totalTokens: number };
        };
      };
    };
  }>;
}

const fixture = JSON.parse(
  readFileSync(
    new URL(
      "../fixtures/codex/app-server-0.138.0-hierarchy-usage.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as EvidenceFixture;

describe("Codex App Server evidence fixture", () => {
  it("represents hierarchy through direct parent edges within one session", () => {
    const byId = new Map(fixture.threads.map((thread) => [thread.id, thread]));
    const grandchild = byId.get("thread-grandchild");
    const child = grandchild
      ? byId.get(grandchild.parentThreadId ?? "")
      : undefined;

    expect(child?.parentThreadId).toBe("thread-root");
    expect(new Set(fixture.threads.map((thread) => thread.sessionId))).toEqual(
      new Set(["session-tree-a"]),
    );
  });

  it("keeps replay metadata outside the schema-shaped notification", () => {
    const replay = fixture.notificationScenarios.find(
      ({ scenario }) => scenario === "replayed-on-attach",
    );

    expect(Object.keys(replay?.notification ?? {}).sort()).toEqual([
      "method",
      "params",
    ]);
    expect(replay?.notification.method).toBe("thread/tokenUsage/updated");
  });

  it("models replay as replacement of the cumulative thread snapshot", () => {
    const [live, replay] = fixture.notificationScenarios;

    expect(live).toBeDefined();
    expect(replay).toBeDefined();
    if (!live || !replay) {
      throw new Error(
        "evidence fixture must include live and replay scenarios",
      );
    }

    expect(replay.notification.params).toEqual(live.notification.params);
    expect(
      replay.notification.params.tokenUsage.total.totalTokens,
    ).toBeGreaterThanOrEqual(
      replay.notification.params.tokenUsage.last.totalTokens,
    );
  });
});
