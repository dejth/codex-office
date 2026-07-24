import { describe, expect, it } from "vitest";

import {
  DEFAULT_BUNDLED_SCHEMA_EVIDENCE,
  negotiateCodexCapabilities,
  REQUIRED_NOTIFICATION_METHODS,
  REQUIRED_REQUEST_METHODS,
  type BundledSchemaEvidence,
} from "../../src/providers/codex/capabilities";

const VALID_INITIALIZE = {
  userAgent: "Codex Desktop/0.138.0 (Mac OS 26.5.2; arm64) synthetic-client",
};

function schema(
  overrides: Partial<BundledSchemaEvidence> = {},
): BundledSchemaEvidence {
  return { ...DEFAULT_BUNDLED_SCHEMA_EVIDENCE, ...overrides };
}

describe("negotiateCodexCapabilities", () => {
  it("keeps bundled schema evidence immutable at runtime", () => {
    expect(Object.isFrozen(DEFAULT_BUNDLED_SCHEMA_EVIDENCE)).toBe(true);
    expect(
      Object.isFrozen(DEFAULT_BUNDLED_SCHEMA_EVIDENCE.requestMethods),
    ).toBe(true);
    expect(
      Object.isFrozen(DEFAULT_BUNDLED_SCHEMA_EVIDENCE.notificationMethods),
    ).toBe(true);
  });

  it("reports exact 0.138.0 as partial metadata and account-capacity polling", () => {
    const result = negotiateCodexCapabilities(VALID_INITIALIZE);

    expect(REQUIRED_REQUEST_METHODS).toEqual([
      "initialize",
      "thread/list",
      "account/rateLimits/read",
    ]);
    expect(result).toEqual({
      status: "partial",
      version: "0.138.0",
      mode: "snapshot-polling",
      experimentalApi: false,
      capabilities: {
        hierarchyPolling: true,
        accountRateLimits: true,
        usage: false,
        liveUpdates: false,
      },
      diagnostics: [{ code: "usage-source-unavailable" }],
    });
  });

  it("accepts the verified Extension Host fingerprint", () => {
    const result = negotiateCodexCapabilities({
      userAgent: "codex-office/0.138.0",
    });

    expect(result.status).toBe("partial");
    expect(result.version).toBe("0.138.0");
    expect(result.capabilities.hierarchyPolling).toBe(true);
  });

  it.each([
    "Codex Desktop/0.138.1 (test)",
    "codex-cli/0.138.0",
    "Spoof Codex Desktop/0.138.0",
    "Codex Desktop/0.138.0 Codex Desktop/0.138.0",
    "codex-office/0.138.0 codex-office/0.138.0",
    "codex-office/0.138.0 Codex Desktop/0.138.0",
    "codex-office/0.138.1",
    "codex-office/0.138.0\nmalformed",
    "codex-office/0.138.0\rmalformed",
    "codex-office/0.138.0\0malformed",
    "Codex Desktop/00.138.0",
    "not-a-fingerprint",
  ])(
    "degrades unsupported, malformed, or ambiguous fingerprint",
    (userAgent) => {
      const result = negotiateCodexCapabilities({ userAgent });
      expect(result.status).toBe("degraded");
      expect(result.version).toBeNull();
      expect(result.capabilities.hierarchyPolling).toBe(false);
      expect(JSON.stringify(result)).not.toContain(userAgent);
    },
  );

  it("correlates runtime version with separately trusted schema evidence", () => {
    const result = negotiateCodexCapabilities(
      VALID_INITIALIZE,
      schema({ pinnedVersion: "0.138.1" }),
    );
    expect(result.status).toBe("degraded");
    expect(result.diagnostics).toContainEqual({
      code: "schema-version-mismatch",
    });
  });

  it("distinguishes missing trusted request and notification schema evidence", () => {
    const missingRequest = negotiateCodexCapabilities(
      VALID_INITIALIZE,
      schema({ requestMethods: ["initialize"] }),
    );
    const missingNotification = negotiateCodexCapabilities(
      VALID_INITIALIZE,
      schema({ notificationMethods: REQUIRED_NOTIFICATION_METHODS.slice(1) }),
    );

    expect(missingRequest.diagnostics).toContainEqual({
      code: "missing-request",
      method: "thread/list",
    });
    expect(missingNotification.diagnostics).toContainEqual({
      code: "missing-schema-notification",
      method: "thread/started",
    });
    expect(missingRequest.status).toBe("degraded");
    expect(missingNotification.status).toBe("degraded");
  });

  it("fails closed for malformed or oversized boundary and schema evidence", () => {
    expect(
      negotiateCodexCapabilities({ userAgent: "x".repeat(513) }).status,
    ).toBe("degraded");
    expect(
      negotiateCodexCapabilities(
        VALID_INITIALIZE,
        schema({
          requestMethods: Array.from({ length: 65 }, () => "initialize"),
        }),
      ).diagnostics,
    ).toContainEqual({ code: "invalid-schema-evidence" });
  });

  it("strips and never returns raw fingerprint or sensitive extras", () => {
    const secret = "/Users/private/secret-workspace";
    const result = negotiateCodexCapabilities({
      userAgent: `Codex Desktop/0.138.0 (${secret})`,
      codexHome: secret,
      preview: "secret prompt",
    });
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("partial");
    expect(serialized).not.toContain("Codex Desktop/0.138.0");
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("secret prompt");
  });

  it("is deterministic and never treats notification schemas as live delivery", () => {
    const first = negotiateCodexCapabilities(VALID_INITIALIZE);
    const second = negotiateCodexCapabilities(VALID_INITIALIZE);
    expect(second).toEqual(first);
    expect(first.capabilities.liveUpdates).toBe(false);
    expect(first.capabilities.usage).toBe(false);
  });
});
