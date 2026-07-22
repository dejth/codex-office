import { readdirSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

interface CorpusFixture {
  fixtureVersion: number;
  source: {
    product: string;
    version: string;
    protocol: string;
    synthetic: boolean;
  };
  caseId: string;
  intent: string;
  input: Array<Record<string, unknown>>;
  expected: Record<string, unknown>;
}

const corpusDirectory = new URL("../fixtures/codex/corpus/", import.meta.url);
const fixtures = readdirSync(corpusDirectory)
  .filter((name) => name.endsWith(".json"))
  .sort()
  .map((name) => ({
    name,
    fixture: JSON.parse(
      readFileSync(new URL(name, corpusDirectory), "utf8"),
    ) as CorpusFixture,
  }));

const forbiddenKeys = new Set([
  "codexHome",
  "content",
  "cwd",
  "gitInfo",
  "path",
  "preview",
  "prompt",
  "text",
]);

function visit(
  value: unknown,
  callback: (key: string, value: unknown) => void,
): void {
  if (Array.isArray(value)) {
    value.forEach((entry) => visit(entry, callback));
    return;
  }

  if (value === null || typeof value !== "object") {
    return;
  }

  Object.entries(value).forEach(([key, entry]) => {
    callback(key, entry);
    visit(entry, callback);
  });
}

describe("Codex synthetic fixture corpus", () => {
  it("covers the Issue #2 behavior matrix", () => {
    expect(fixtures.map(({ fixture }) => fixture.caseId)).toEqual([
      "nested-subagents",
      "missing-fields",
      "malformed-input",
      "duplicate-events",
      "resume-replay",
      "cumulative-regression",
      "usage-boundaries",
      "child-replayed-context",
      "missing-cached-input",
      "out-of-order-live",
      "counter-reset-new-epoch",
      "conflicting-components",
    ]);
  });

  it.each(fixtures)(
    "marks $name as deterministic synthetic evidence",
    ({ fixture }) => {
      expect(fixture.fixtureVersion).toBe(1);
      expect(fixture.source).toEqual({
        product: "codex-cli",
        version: "0.138.0",
        protocol: "app-server-v2",
        synthetic: true,
      });
      expect(fixture.intent.length).toBeGreaterThan(0);
      expect(fixture.expected).toHaveProperty("disposition");
      expect(fixture.expected).toHaveProperty("connection");

      const timestamps = fixture.input.map(({ receivedAt }) => receivedAt);
      const sequences = fixture.input.map(({ seq }) => seq);
      expect(sequences).toEqual(fixture.input.map((_, index) => index + 1));
      expect(timestamps).toEqual(
        timestamps
          .slice()
          .sort((left, right) => String(left).localeCompare(String(right))),
      );
      timestamps.forEach((timestamp) => {
        expect(timestamp).toMatch(/^2026-01-01T00:00:\d{2}\.000Z$/);
        expect(Number.isNaN(Date.parse(String(timestamp)))).toBe(false);
      });

      visit(fixture, (key, value) => {
        if (
          /^(id|parentId|sessionId|threadId|turnId)$/.test(key) &&
          typeof value === "string"
        ) {
          expect(value).toMatch(/^(session|thread|turn)-\d{4}$/);
        }
      });
    },
  );

  it.each(fixtures)(
    "contains no sensitive keys or real-machine values in $name",
    ({ fixture }) => {
      visit(fixture, (key, value) => {
        expect(forbiddenKeys.has(key), `forbidden key: ${key}`).toBe(false);

        if (typeof value === "string") {
          expect(value).not.toMatch(/\/Users\/|\/home\/|[A-Za-z]:\\/);
          expect(value).not.toMatch(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/);
          expect(value).not.toMatch(/\b(?:localhost|[\w-]+\.local)\b/i);
          expect(value).not.toMatch(
            /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-/i,
          );
        }
      });
    },
  );

  it("keeps fixture metadata outside schema-shaped notifications", () => {
    const notifications: Array<Record<string, unknown>> = [];

    fixtures.forEach(({ fixture }) => {
      fixture.input.forEach((entry) => {
        if (entry.notification && typeof entry.notification === "object") {
          notifications.push(entry.notification as Record<string, unknown>);
        }
      });
    });

    expect(notifications.length).toBeGreaterThan(0);
    notifications.forEach((notification) => {
      expect(Object.keys(notification).sort()).toEqual(["method", "params"]);
    });
  });

  it("encodes duplicate and replay usage as non-additive outcomes", () => {
    const duplicate = fixtures.find(
      ({ fixture }) => fixture.caseId === "duplicate-events",
    );
    const replay = fixtures.find(
      ({ fixture }) => fixture.caseId === "resume-replay",
    );

    expect(duplicate?.fixture.expected.disposition).toBe("replace-then-noop");
    expect(replay?.fixture.expected.disposition).toBe(
      "preserve-disconnected-then-replace",
    );
  });
});
