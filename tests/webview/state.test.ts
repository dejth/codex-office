import { describe, expect, it } from "vitest";

import {
  replaceConnection,
  replaceConnectionFromSnapshot,
} from "../../src/webview/state";

describe("webview connection state", () => {
  it("applies authoritative connection-only degradation", () => {
    expect(
      replaceConnection(
        { state: "connected", reason: null },
        {
          state: "degraded",
          reason: "provider-transport-unavailable",
        },
      ),
    ).toEqual({
      state: "degraded",
      reason: "provider-transport-unavailable",
    });
    expect(
      replaceConnection(
        { state: "degraded", reason: "invalid-provider-data" },
        { state: "disconnected", reason: "provider-unavailable" },
      ),
    ).toEqual({
      state: "disconnected",
      reason: "provider-unavailable",
    });
  });

  it("retains a bounded diagnostic when a degraded snapshot arrives later", () => {
    expect(
      replaceConnectionFromSnapshot(
        { state: "degraded", reason: "unsupported-version" },
        "degraded",
      ),
    ).toEqual({
      state: "degraded",
      reason: "unsupported-version",
    });

    expect(
      replaceConnectionFromSnapshot(
        { state: "degraded", reason: "invalid-provider-data" },
        "connected",
      ),
    ).toEqual({
      state: "connected",
      reason: null,
    });
  });
});
