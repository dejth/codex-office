import { z } from "zod";

export const REQUIRED_REQUEST_METHODS = [
  "initialize",
  "thread/list",
  "account/rateLimits/read",
] as const;

export const REQUIRED_NOTIFICATION_METHODS = [
  "thread/started",
  "thread/status/changed",
  "thread/closed",
  "thread/tokenUsage/updated",
] as const;

export type RequiredRequestMethod = (typeof REQUIRED_REQUEST_METHODS)[number];
export type RequiredNotificationMethod =
  (typeof REQUIRED_NOTIFICATION_METHODS)[number];

export interface BundledSchemaEvidence {
  pinnedVersion: string;
  requestMethods: readonly string[];
  notificationMethods: readonly string[];
}

export interface CapabilityNegotiationOptions {
  allowUnverifiedRuntime?: boolean;
}

export const DEFAULT_BUNDLED_SCHEMA_EVIDENCE: BundledSchemaEvidence =
  Object.freeze({
    pinnedVersion: "0.146.0",
    requestMethods: Object.freeze([...REQUIRED_REQUEST_METHODS]),
    notificationMethods: Object.freeze([...REQUIRED_NOTIFICATION_METHODS]),
  });

export type CapabilityDiagnostic =
  | { code: "invalid-initialize" }
  | { code: "unsupported-runtime-version" }
  | { code: "invalid-schema-evidence" }
  | { code: "schema-version-mismatch" }
  | { code: "missing-request"; method: RequiredRequestMethod }
  | {
      code: "missing-schema-notification";
      method: RequiredNotificationMethod;
    }
  | { code: "usage-source-unavailable" };

export interface CodexCapabilityResult {
  status: "partial" | "degraded";
  version: string | null;
  verification: "schema-verified" | "runtime-probed" | "unavailable";
  mode: "snapshot-polling";
  experimentalApi: false;
  capabilities: {
    hierarchyPolling: boolean;
    accountRateLimits: boolean;
    usage: false;
    liveUpdates: false;
  };
  diagnostics: CapabilityDiagnostic[];
}

const initializeSchema = z
  .object({ userAgent: z.string().min(1).max(512) })
  .strip();
const boundedMethod = z.string().min(1).max(128);
const bundledSchema = z.object({
  pinnedVersion: boundedMethod,
  requestMethods: z.array(boundedMethod).max(64),
  notificationMethods: z.array(boundedMethod).max(64),
});

/** Negotiates the hierarchy-only adapter pinned by ADR-0005. */
export function negotiateCodexCapabilities(
  untrustedInitialize: unknown,
  schemaEvidence: BundledSchemaEvidence = DEFAULT_BUNDLED_SCHEMA_EVIDENCE,
  options: CapabilityNegotiationOptions = {},
): CodexCapabilityResult {
  const initialize = initializeSchema.safeParse(untrustedInitialize);
  const schema = bundledSchema.safeParse(schemaEvidence);
  const diagnostics: CapabilityDiagnostic[] = [];

  if (!initialize.success) diagnostics.push({ code: "invalid-initialize" });
  if (!schema.success) diagnostics.push({ code: "invalid-schema-evidence" });
  if (!initialize.success || !schema.success) {
    return makeResult(null, false, false, diagnostics);
  }

  const runtimeVersion = parseRuntimeVersion(initialize.data.userAgent);
  const schemaVerifiedRuntime = runtimeVersion === "0.146.0";
  if (!schemaVerifiedRuntime) {
    diagnostics.push({ code: "unsupported-runtime-version" });
  }
  const schemaVersionMatches =
    schema.data.pinnedVersion === DEFAULT_BUNDLED_SCHEMA_EVIDENCE.pinnedVersion;
  if (
    !schemaVersionMatches ||
    (runtimeVersion !== null && runtimeVersion !== schema.data.pinnedVersion)
  ) {
    diagnostics.push({ code: "schema-version-mismatch" });
  }

  const requests = new Set(schema.data.requestMethods);
  const notifications = new Set(schema.data.notificationMethods);
  for (const method of REQUIRED_REQUEST_METHODS) {
    if (!requests.has(method))
      diagnostics.push({ code: "missing-request", method });
  }
  for (const method of REQUIRED_NOTIFICATION_METHODS) {
    if (!notifications.has(method)) {
      diagnostics.push({ code: "missing-schema-notification", method });
    }
  }

  const hasMissingContractEvidence = diagnostics.some(
    ({ code }) =>
      code === "missing-request" || code === "missing-schema-notification",
  );
  const runtimeAllowed =
    schemaVerifiedRuntime ||
    (runtimeVersion !== null && options.allowUnverifiedRuntime === true);
  const hierarchyPolling =
    runtimeAllowed && schemaVersionMatches && !hasMissingContractEvidence;
  diagnostics.push({ code: "usage-source-unavailable" });
  return makeResult(
    runtimeVersion,
    hierarchyPolling,
    schemaVerifiedRuntime,
    diagnostics,
  );
}

function parseRuntimeVersion(userAgent: string): string | null {
  for (const character of userAgent) {
    const codePoint = character.codePointAt(0);
    if (codePoint !== undefined && (codePoint <= 0x1f || codePoint === 0x7f)) {
      return null;
    }
  }
  if (
    [...userAgent.matchAll(/(?:Codex Desktop|codex-office)\//gu)].length !== 1
  ) {
    return null;
  }
  const match =
    /^(?:Codex Desktop|codex-office)\/((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-(?:0|[1-9]\d*|[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?)(?: [\x20-\x7E]*)?$/u.exec(
      userAgent,
    );
  if (match === null) return null;
  const version = match[1];
  return version !== undefined && version.length <= 64 ? version : null;
}

function makeResult(
  version: string | null,
  hierarchyPolling: boolean,
  schemaVerifiedRuntime: boolean,
  diagnostics: CapabilityDiagnostic[],
): CodexCapabilityResult {
  return {
    status: hierarchyPolling ? "partial" : "degraded",
    version,
    verification: hierarchyPolling
      ? schemaVerifiedRuntime
        ? "schema-verified"
        : "runtime-probed"
      : "unavailable",
    mode: "snapshot-polling",
    experimentalApi: false,
    capabilities: {
      hierarchyPolling,
      accountRateLimits: hierarchyPolling,
      usage: false,
      liveUpdates: false,
    },
    diagnostics,
  };
}
