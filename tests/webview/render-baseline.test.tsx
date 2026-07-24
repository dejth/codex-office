import { createHash } from "node:crypto";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { previewSnapshot } from "../../src/protocol/preview-fixture";
import { AccountOverview } from "../../src/webview/meter-view";
import { OfficeView } from "../../src/webview/office-view";

const digest = (markup: string) =>
  createHash("sha256").update(markup).digest("hex");

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
      "132d3a56e25285ec3856ca1e3629ba65d1c2e2d6538a547997a05af944775406",
    );
  });

  it("keeps the compact account structure stable", () => {
    const markup = renderToStaticMarkup(
      <AccountOverview
        agents={previewSnapshot.agents}
        rateLimits={previewSnapshot.rateLimits}
      />,
    );
    expect(digest(markup)).toBe(
      "04982a97e2e5be13829947fada9262671dc1bf174a3c21a8c31ba611166cba47",
    );
  });
});
