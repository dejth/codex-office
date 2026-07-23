import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { previewSnapshot } from "../../src/protocol/preview-fixture";
import { OfficeView } from "../../src/webview/office-view";

describe("Office view", () => {
  it("renders deterministic stations from sanitized agent statuses", () => {
    const html = renderToStaticMarkup(
      <OfficeView
        agents={previewSnapshot.agents}
        reducedMotion={false}
        selectedId="agent_preview_3"
        onSelect={() => undefined}
      />,
    );

    expect(html.match(/class="office-station"/g)).toHaveLength(4);
    expect(html).toContain("Writing desk");
    expect(html).toContain("Reading nook");
    expect(html).toContain("Approval desk");
    expect(html).toContain("Celebration corner");
    expect(html).toContain('data-motion="typing-loop"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).not.toContain("sessionId");
  });

  it("renders static presentation states when reduced motion is enabled", () => {
    const html = renderToStaticMarkup(
      <OfficeView
        agents={previewSnapshot.agents}
        reducedMotion
        selectedId={null}
        onSelect={() => undefined}
      />,
    );

    expect(html).toContain('data-reduced-motion="true"');
    expect(html.match(/data-motion="none"/g)).toHaveLength(4);
    expect(html).not.toContain('data-transition="crossfade"');
  });
});
