import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ConnectionNotice } from "../../src/webview/connection-notice";

describe("Connection notice", () => {
  it("is silent while connected", () => {
    expect(renderToStaticMarkup(<ConnectionNotice state="connected" />)).toBe(
      "",
    );
  });

  it.each([
    ["disconnected", "Waiting for a local provider"],
    ["degraded", "Showing the last safe snapshot"],
  ] as const)("renders a non-color status cue for %s", (state, text) => {
    const html = renderToStaticMarkup(<ConnectionNotice state={state} />);
    expect(html).toContain('role="status"');
    expect(html).toContain(text);
  });
});
