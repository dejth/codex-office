import { createHash } from "node:crypto";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { previewSnapshot } from "../../src/protocol/preview-fixture";
import { MeterView } from "../../src/webview/meter-view";
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
      "4556b81ccee353e2e2574b9f4823e718ca2a7b675a328d15e18fe5b3f78a211e",
    );
  });

  it("keeps the Meter structure stable", () => {
    const markup = renderToStaticMarkup(
      <MeterView
        agents={previewSnapshot.agents}
        selectedId="agent_preview_3"
        onSelect={() => undefined}
      />,
    );
    expect(digest(markup)).toBe(
      "2dbfda3edced4b1f55afea8c072b5806edefac251522a6fb7f1bb195ef04f500",
    );
  });
});
