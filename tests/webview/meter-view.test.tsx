import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { previewSnapshot } from "../../src/protocol/preview-fixture";
import { AccountOverview } from "../../src/webview/meter-view";

describe("compact account overview", () => {
  it("renders reported capacity, disclaimer, and hierarchy counts", () => {
    const html = renderToStaticMarkup(
      <AccountOverview
        agents={previewSnapshot.agents}
        rateLimits={previewSnapshot.rateLimits}
      />,
    );

    expect(html).toContain("Local Codex account");
    expect(html).toContain("Not billing data");
    expect(html).toContain("38% used");
    expect(html).toContain("5-hour window");
    expect(html).toContain("62% used");
    expect(html).toContain("1-week window");
    expect(html).toContain("Root sessions</dt><dd>1");
    expect(html).toContain("Subagents</dt><dd>3");
    expect(html).toContain("Threads</dt><dd>4");
    expect(html).not.toContain("Reported thread tokens");
    expect(html).not.toContain("Components");
    expect(html).not.toContain("cost estimate");
  });

  it("keeps unavailable capacity distinct from zero", () => {
    const html = renderToStaticMarkup(
      <AccountOverview agents={[]} rateLimits={null} />,
    );

    expect(html).toContain("Account capacity unavailable");
    expect(html).not.toContain("% used");
    expect(html).toContain("Root sessions</dt><dd>0");
  });
});
