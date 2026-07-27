import { createHash } from "node:crypto";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { previewSnapshot } from "../../src/protocol/preview-fixture";
import { AccountOverview } from "../../src/webview/meter-view";
import { OfficeView } from "../../src/webview/office-view";

const digest = (markup: string) =>
  createHash("sha256").update(markup).digest("hex");

const normalizeEnvironmentText = (markup: string) =>
  markup.replace(/Resets [^<]+/g, "Resets [local date and time]");

describe("deterministic composed-view baselines", () => {
  it("keeps the Office structure stable", () => {
    const markup = renderToStaticMarkup(
      <OfficeView
        agents={previewSnapshot.agents}
        reducedMotion
        selectedId="agent_preview_3"
        onSelect={() => undefined}
        connection="connected"
      />,
    );
    expect(digest(markup)).toBe(
      "0ad89fd4e91dd5ba1a1c48e1267a1789b8cb2d88f4c5d4010f4f665fa955e3d8",
    );
  });

  it("keeps the compact account structure stable", () => {
    const markup = renderToStaticMarkup(
      <AccountOverview
        agents={previewSnapshot.agents}
        rateLimits={previewSnapshot.rateLimits}
      />,
    );
    expect(digest(normalizeEnvironmentText(markup))).toBe(
      "87f0fff68805dd616e4e6510f6b143baba67d3750640206be4339d18f2200d6f",
    );
  });
});
