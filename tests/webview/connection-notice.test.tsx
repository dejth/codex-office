import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ConnectionNotice } from "../../src/webview/connection-notice";

describe("Connection notice", () => {
  it("is silent while connected", () => {
    expect(
      renderToStaticMarkup(
        <ConnectionNotice state="connected" reason={null} />,
      ),
    ).toBe("");
  });

  it.each([
    ["disconnected", null, "Waiting for a local provider"],
    ["disconnected", "workspace-required", "Open a workspace folder"],
    ["degraded", null, "Showing the last safe snapshot"],
    [
      "degraded",
      "provider-executable-unavailable",
      "Codex executable was not found",
    ],
    [
      "degraded",
      "provider-transport-unavailable",
      "provider stopped responding",
    ],
    ["degraded", "unsupported-version", "currently supports 0.146.0"],
    ["degraded", "invalid-provider-data", "invalid provider data"],
  ] as const)(
    "renders a non-color status cue for %s",
    (state, reason, text) => {
      const html = renderToStaticMarkup(
        <ConnectionNotice state={state} reason={reason} />,
      );
      expect(html).toContain('role="status"');
      expect(html).toContain(text);
    },
  );
});
