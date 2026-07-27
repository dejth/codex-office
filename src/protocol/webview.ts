import { z } from "zod";

import type { AgentNode, OfficeSnapshot } from "../domain/model";

export const WEBVIEW_PROTOCOL_VERSION = 2 as const;
const MAX_AGENTS = 1_000;
const MAX_AGENT_DEPTH = 32;
const MAX_GRAPH_VALUES = 20_000;
// Protocol wrappers and alternating object/array tree levels add structural
// depth beyond the documented agent depth. Keep this guard above that shape;
// snapshotSchema enforces the exact 32-agent boundary.
const MAX_GRAPH_DEPTH = 96;

const idSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/);
const safeNameSchema = z
  .string()
  .refine(
    (value) =>
      [...value].length >= 1 &&
      [...value].length <= 100 &&
      !containsUnsafeNameCodePoint(value),
  );
const statusSchema = z.enum([
  "thinking",
  "reading",
  "editing",
  "running-command",
  "waiting-approval",
  "completed",
  "failed",
  "idle",
  "unknown",
]);
const tokenSchema = z.number().int().nonnegative().safe().nullable();
const usageSchema = z
  .object({
    input: tokenSchema,
    cachedInput: tokenSchema,
    output: tokenSchema,
    total: tokenSchema,
    provenance: z.enum(["reported", "derived", "estimated"]),
  })
  .strict();
const rateLimitWindowSchema = z
  .object({
    usedPercent: z.number().finite().min(0).max(100),
    windowDurationMinutes: z.number().int().positive().safe().nullable(),
    resetsAt: z.string().refine(isCanonicalTimestamp).nullable(),
  })
  .strict();
const accountRateLimitsSchema = z
  .object({
    primary: rateLimitWindowSchema.nullable(),
    secondary: rateLimitWindowSchema.nullable(),
    provenance: z.literal("reported"),
  })
  .strict();

export interface WebviewAgent {
  id: string;
  name: string;
  status: z.infer<typeof statusSchema>;
  lastActivityAt: string | null;
  usage: z.infer<typeof usageSchema> | null;
  children: WebviewAgent[];
}

const agentSchema: z.ZodType<WebviewAgent> = z.lazy(() =>
  z
    .object({
      id: idSchema,
      name: safeNameSchema,
      status: statusSchema,
      lastActivityAt: z.string().refine(isCanonicalTimestamp).nullable(),
      usage: usageSchema.nullable(),
      children: z.array(agentSchema).max(MAX_AGENTS),
    })
    .strict(),
);

const snapshotSchema = z
  .object({
    id: idSchema,
    updatedAt: z.string().refine(isCanonicalTimestamp),
    agents: z.array(agentSchema).max(MAX_AGENTS),
    rateLimits: accountRateLimitsSchema.nullable(),
    unresolved: z
      .array(
        z
          .object({
            id: idSchema,
            reason: z.enum([
              "duplicate-id",
              "missing-parent",
              "cycle",
              "blocked-by-invalid-parent",
            ]),
          })
          .strict(),
      )
      .max(MAX_AGENTS),
    connection: z.enum(["connected", "disconnected", "degraded"]),
  })
  .strict()
  .superRefine((snapshot, context) => {
    const stack = snapshot.agents.map((agent) => ({ agent, depth: 1 }));
    const ids = new Set(snapshot.unresolved.map(({ id }) => id));
    if (ids.size !== snapshot.unresolved.length) {
      context.addIssue({ code: "custom", message: "duplicate-id" });
      return;
    }
    let count = snapshot.unresolved.length;
    while (stack.length > 0) {
      const current = stack.pop()!;
      count += 1;
      if (ids.has(current.agent.id)) {
        context.addIssue({ code: "custom", message: "duplicate-id" });
        return;
      }
      ids.add(current.agent.id);
      if (count > MAX_AGENTS) {
        context.addIssue({ code: "custom", message: "agent-limit" });
        return;
      }
      if (current.depth > MAX_AGENT_DEPTH) {
        context.addIssue({ code: "custom", message: "depth-limit" });
        return;
      }
      for (const child of current.agent.children) {
        stack.push({ agent: child, depth: current.depth + 1 });
      }
    }
  });

const protocolVersion = z.literal(WEBVIEW_PROTOCOL_VERSION);
const sequence = z.number().int().nonnegative().safe();
const hostMessageSchema = z.discriminatedUnion("type", [
  z
    .object({
      protocolVersion,
      sequence,
      type: z.literal("snapshot"),
      snapshot: snapshotSchema,
    })
    .strict(),
  z
    .object({
      protocolVersion,
      sequence,
      type: z.literal("connection"),
      state: z.enum(["connected", "disconnected", "degraded"]),
      reason: z
        .enum([
          "provider-unavailable",
          "workspace-required",
          "provider-executable-unavailable",
          "provider-transport-unavailable",
          "unsupported-version",
          "invalid-provider-data",
          "usage-unavailable",
        ])
        .nullable(),
    })
    .strict(),
  z
    .object({
      protocolVersion,
      sequence,
      type: z.literal("settings"),
      reducedMotion: z.boolean(),
    })
    .strict(),
  z
    .object({ protocolVersion, sequence, type: z.literal("refresh-requested") })
    .strict(),
]);
const webviewMessageSchema = z.discriminatedUnion("type", [
  z.object({ protocolVersion, type: z.literal("ready") }).strict(),
  z
    .object({
      protocolVersion,
      type: z.literal("select-agent"),
      agentId: idSchema,
    })
    .strict(),
  z.object({ protocolVersion, type: z.literal("refresh") }).strict(),
  z.object({ protocolVersion, type: z.literal("open-settings") }).strict(),
]);

export type HostToWebviewMessage = z.infer<typeof hostMessageSchema>;
export type WebviewToHostMessage = z.infer<typeof webviewMessageSchema>;
export type ProtocolFailureReason =
  "invalid-message" | "unsupported-version" | "unknown-type" | "payload-limit";
export type ProtocolParseResult<T> =
  { ok: true; message: T } | { ok: false; reason: ProtocolFailureReason };

export type WebviewSnapshot = z.infer<typeof snapshotSchema>;
export type ProjectionResult =
  | {
      ok: true;
      snapshot: WebviewSnapshot;
      domainIdByOpaqueId: ReadonlyMap<string, string>;
    }
  | { ok: false; reason: "invalid-source" | "source-limit" };
export interface ProjectionUnresolved {
  id: string;
  reason:
    "duplicate-id" | "missing-parent" | "cycle" | "blocked-by-invalid-parent";
}

/** Host messages are ordered independently by type within one webview instance. */
export function shouldAcceptHostSequence(
  lastAccepted: number | undefined,
  next: number,
): boolean {
  return lastAccepted === undefined || next > lastAccepted;
}

/** Mints a minimal panel projection; raw identity stays in the host-only map. */
export function projectOfficeSnapshot(
  source: OfficeSnapshot,
  unresolved: readonly ProjectionUnresolved[] = [],
): ProjectionResult {
  try {
    return projectOfficeSnapshotUnsafe(source, unresolved);
  } catch {
    return { ok: false, reason: "invalid-source" };
  }
}

function projectOfficeSnapshotUnsafe(
  source: OfficeSnapshot,
  unresolved: readonly ProjectionUnresolved[],
): ProjectionResult {
  if (!isBoundedDataGraph(source) || !isBoundedDataGraph(unresolved)) {
    return { ok: false, reason: "invalid-source" };
  }
  if (
    !isRecord(source) ||
    typeof source.updatedAt !== "string" ||
    !isCanonicalTimestamp(source.updatedAt) ||
    !accountRateLimitsSchema.nullable().safeParse(source.rateLimits).success
  ) {
    return { ok: false, reason: "invalid-source" };
  }
  if (!Array.isArray(source.agents) || !Array.isArray(unresolved)) {
    return { ok: false, reason: "invalid-source" };
  }
  const roots: WebviewAgent[] = [];
  const safeUnresolved: WebviewSnapshot["unresolved"] = [];
  const domainIdByOpaqueId = new Map<string, string>();
  const seenObjects = new Set<object>();
  const seenDomainIds = new Set<string>();
  let nextId = 1;
  let count = unresolved.length;
  if (count > MAX_AGENTS) return { ok: false, reason: "source-limit" };

  for (const item of unresolved) {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      !isUnresolvedReason(item.reason)
    ) {
      return { ok: false, reason: "invalid-source" };
    }
    const id = mintAgentId(nextId++);
    safeUnresolved.push({ id, reason: item.reason });
    domainIdByOpaqueId.set(id, item.id);
  }

  const stack: Array<{
    source: AgentNode;
    target: WebviewAgent[];
    depth: number;
  }> = [];
  for (let index = source.agents.length - 1; index >= 0; index -= 1) {
    stack.push({ source: source.agents[index]!, target: roots, depth: 1 });
  }
  while (stack.length > 0) {
    const current = stack.pop()!;
    count += 1;
    if (count > MAX_AGENTS || current.depth > MAX_AGENT_DEPTH) {
      return { ok: false, reason: "source-limit" };
    }
    if (
      !isRecord(current.source) ||
      seenObjects.has(current.source) ||
      typeof current.source.id !== "string" ||
      seenDomainIds.has(current.source.id) ||
      !statusSchema.safeParse(current.source.status).success ||
      !usageSchema.nullable().safeParse(current.source.usage).success ||
      !Array.isArray(current.source.children)
    ) {
      return { ok: false, reason: "invalid-source" };
    }
    seenObjects.add(current.source);
    seenDomainIds.add(current.source.id);
    const id = mintAgentId(nextId++);
    const projectedName =
      typeof current.source.displayName === "string" &&
      safeNameSchema.safeParse(current.source.displayName).success
        ? current.source.displayName
        : `Agent ${nextId - 1}`;
    const projected: WebviewAgent = {
      id,
      name: projectedName,
      status: current.source.status,
      lastActivityAt: current.source.lastActivityAt,
      usage: current.source.usage === null ? null : { ...current.source.usage },
      children: [],
    };
    current.target.push(projected);
    domainIdByOpaqueId.set(id, current.source.id);
    for (
      let index = current.source.children.length - 1;
      index >= 0;
      index -= 1
    ) {
      stack.push({
        source: current.source.children[index]!,
        target: projected.children,
        depth: current.depth + 1,
      });
    }
  }

  const snapshot: WebviewSnapshot = {
    id: "snapshot_current",
    updatedAt: source.updatedAt,
    agents: roots,
    rateLimits:
      source.rateLimits === null
        ? null
        : {
            primary:
              source.rateLimits.primary === null
                ? null
                : { ...source.rateLimits.primary },
            secondary:
              source.rateLimits.secondary === null
                ? null
                : { ...source.rateLimits.secondary },
            provenance: "reported",
          },
    unresolved: safeUnresolved,
    connection: source.connection,
  };
  return snapshotSchema.safeParse(snapshot).success
    ? { ok: true, snapshot, domainIdByOpaqueId }
    : { ok: false, reason: "invalid-source" };
}

function mintAgentId(sequence: number): string {
  return `agent_${sequence.toString().padStart(4, "0")}`;
}

function isUnresolvedReason(
  value: unknown,
): value is ProjectionUnresolved["reason"] {
  return (
    typeof value === "string" &&
    [
      "duplicate-id",
      "missing-parent",
      "cycle",
      "blocked-by-invalid-parent",
    ].includes(value)
  );
}

/** Strict own-key policy: unknown fields are rejected, never forwarded. */
export function parseHostToWebviewMessage(
  value: unknown,
): ProtocolParseResult<HostToWebviewMessage> {
  try {
    return parseMessage(value, hostMessageSchema, [
      "snapshot",
      "connection",
      "settings",
      "refresh-requested",
    ]);
  } catch {
    return { ok: false, reason: "invalid-message" };
  }
}

export function parseWebviewToHostMessage(
  value: unknown,
): ProtocolParseResult<WebviewToHostMessage> {
  try {
    return parseMessage(value, webviewMessageSchema, [
      "ready",
      "select-agent",
      "refresh",
      "open-settings",
    ]);
  } catch {
    return { ok: false, reason: "invalid-message" };
  }
}

function parseMessage<T>(
  value: unknown,
  schema: z.ZodType<T>,
  knownTypes: readonly string[],
): ProtocolParseResult<T> {
  if (!isBoundedDataGraph(value)) return { ok: false, reason: "payload-limit" };
  if (!isRecord(value)) return { ok: false, reason: "invalid-message" };
  if (value.protocolVersion !== WEBVIEW_PROTOCOL_VERSION)
    return { ok: false, reason: "unsupported-version" };
  if (typeof value.type !== "string" || !knownTypes.includes(value.type))
    return { ok: false, reason: "unknown-type" };
  const parsed = schema.safeParse(value);
  return parsed.success
    ? { ok: true, message: parsed.data }
    : { ok: false, reason: "invalid-message" };
}

function isCanonicalTimestamp(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value))
    return false;
  const parsed = Date.parse(value);
  return !Number.isNaN(parsed) && new Date(parsed).toISOString() === value;
}

function containsUnsafeNameCodePoint(value: string): boolean {
  for (const character of value) {
    const point = character.codePointAt(0)!;
    if (
      point <= 0x1f ||
      (point >= 0x7f && point <= 0x9f) ||
      point === 0x061c ||
      point === 0x200e ||
      point === 0x200f ||
      (point >= 0x202a && point <= 0x202e) ||
      (point >= 0x2066 && point <= 0x2069)
    ) {
      return true;
    }
  }
  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBoundedDataGraph(root: unknown): boolean {
  const stack: Array<{ value: unknown; depth: number }> = [
    { value: root, depth: 0 },
  ];
  const seen = new Set<object>();
  let count = 0;
  while (stack.length > 0) {
    const { value, depth } = stack.pop()!;
    count += 1;
    if (count > MAX_GRAPH_VALUES || depth > MAX_GRAPH_DEPTH) return false;
    if (typeof value === "string" && value.length > 4_096) return false;
    if (typeof value !== "object" || value === null) continue;
    if (seen.has(value)) return false;
    seen.add(value);
    const prototype = Object.getPrototypeOf(value);
    if (
      prototype !== Object.prototype &&
      prototype !== Array.prototype &&
      prototype !== null
    )
      return false;
    for (const [key, descriptor] of Object.entries(
      Object.getOwnPropertyDescriptors(value),
    )) {
      if (["__proto__", "prototype", "constructor"].includes(key)) return false;
      if ("get" in descriptor || "set" in descriptor) return false;
      if (key !== "length")
        stack.push({ value: descriptor.value, depth: depth + 1 });
    }
  }
  return true;
}
