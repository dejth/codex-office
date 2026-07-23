import { describe, expect, it } from "vitest";

import { replaceConnection } from "../../src/webview/state";

describe("webview connection state", () => {
  it("applies authoritative connection-only degradation", () => {
    expect(replaceConnection("connected", "degraded")).toBe("degraded");
    expect(replaceConnection("degraded", "disconnected")).toBe("disconnected");
  });
});
