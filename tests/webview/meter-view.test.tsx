import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { previewSnapshot } from "../../src/protocol/preview-fixture";
import { formatTokenValue, MeterView } from "../../src/webview/meter-view";

describe("Meter view", () => {
  it("renders honest summary, provenance, hierarchy, and missing values", () => {
    const html = renderToStaticMarkup(
      <MeterView
        agents={previewSnapshot.agents}
        selectedId="agent_preview_3"
        onSelect={() => undefined}
      />,
    );

    expect(html).toContain("Reported usage");
    expect(html).toContain("Not billing data");
    expect(html).toContain("Parent and child context may overlap");
    expect(html).toContain("Not combined across threads");
    expect(html).toContain("Derived");
    expect(html).toContain("Reported");
    expect(html).toContain("Unavailable");
    expect(html).toContain("Cached input");
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("hierarchy level 3");
    expect(html).not.toContain("cost estimate");
    expect(html).not.toContain("sessionId");
  });

  it("keeps unknown values distinct from zero", () => {
    expect(formatTokenValue(null)).toBe("—");
    expect(formatTokenValue(0)).toBe("0");
    expect(formatTokenValue(Number.MAX_SAFE_INTEGER)).toBe(
      "9,007,199,254,740,991",
    );
  });
});
