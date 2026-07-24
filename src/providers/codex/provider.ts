import { z } from "zod";

import {
  buildAgentHierarchy,
  type HierarchyAgent,
} from "../../domain/hierarchy";
import type {
  AccountRateLimits,
  AgentStatus,
  OfficeSnapshot,
  RateLimitWindow,
} from "../../domain/model";
import { negotiateCodexCapabilities } from "./capabilities";
import {
  CodexStdioTransport,
  CodexTransportError,
  type CodexRpcTransport,
} from "./transport";

export type ProviderDiagnostic =
  | "none"
  | "workspace-required"
  | "executable-unavailable"
  | "transport-unavailable"
  | "unsupported-version"
  | "invalid-provider-data";

export interface AgentProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  snapshot(): Promise<OfficeSnapshot>;
  refresh(): Promise<OfficeSnapshot>;
  diagnostic(): ProviderDiagnostic;
  subscribe(listener: (snapshot: OfficeSnapshot) => void): () => void;
}

export class CodexProvider implements AgentProvider {
  private listeners = new Set<(snapshot: OfficeSnapshot) => void>();
  private transport: CodexRpcTransport | undefined;
  private connected = false;
  private polling: Promise<OfficeSnapshot> | undefined;
  private current = emptySnapshot("disconnected");
  private generation = 0;
  private currentDiagnostic: ProviderDiagnostic = "none";
  private rateLimits: AccountRateLimits | null = null;
  private rateLimitsReadAt: number | null = null;
  private activeWorkspaceCwd: string | undefined;

  constructor(
    private readonly createTransport: () => CodexRpcTransport = () =>
      new CodexStdioTransport(),
    private readonly now: () => Date = () => new Date(),
    private readonly workspaceCwd?: string | (() => string | undefined),
    private readonly requireWorkspace = false,
  ) {}

  async connect(): Promise<void> {
    if (this.transport !== undefined) return;
    const workspaceCwd =
      typeof this.workspaceCwd === "function"
        ? this.workspaceCwd()
        : this.workspaceCwd;
    if (this.requireWorkspace && workspaceCwd === undefined) {
      this.connected = false;
      this.currentDiagnostic = "workspace-required";
      this.current = emptySnapshot("disconnected");
      return;
    }
    this.activeWorkspaceCwd = workspaceCwd;
    const transport = this.createTransport();
    const generation = ++this.generation;
    this.transport = transport;
    try {
      transport.start();
      const initialize = await transport.request("initialize", {
        clientInfo: {
          name: "codex-office",
          title: "Codex Office",
          version: "0.0.1",
        },
        capabilities: {
          experimentalApi: false,
          requestAttestation: false,
        },
      });
      if (generation !== this.generation || transport !== this.transport) {
        transport.stop();
        return;
      }
      const capability = negotiateCodexCapabilities(initialize);
      if (!capability.capabilities.hierarchyPolling) {
        this.currentDiagnostic = capability.diagnostics.some(
          ({ code }) => code === "unsupported-runtime-version",
        )
          ? "unsupported-version"
          : "invalid-provider-data";
        this.setDegraded();
        transport.stop();
        this.transport = undefined;
        return;
      }
      transport.notify("initialized");
      this.connected = true;
      this.currentDiagnostic = "none";
      await this.poll(generation);
    } catch (error) {
      transport.stop();
      if (generation === this.generation && transport === this.transport) {
        this.transport = undefined;
        this.connected = false;
        this.currentDiagnostic = diagnosticFromError(error);
        this.setDegraded();
      }
    }
  }

  async disconnect(): Promise<void> {
    this.generation += 1;
    this.connected = false;
    this.transport?.stop();
    this.transport = undefined;
    this.polling = undefined;
    this.listeners.clear();
    this.rateLimits = null;
    this.rateLimitsReadAt = null;
    this.activeWorkspaceCwd = undefined;
    this.current = {
      ...this.current,
      rateLimits: null,
      connection: "disconnected",
    };
  }

  async snapshot(): Promise<OfficeSnapshot> {
    return cloneSnapshot(this.current);
  }

  async refresh(): Promise<OfficeSnapshot> {
    return this.connected
      ? this.poll(this.generation)
      : cloneSnapshot(this.current);
  }

  diagnostic(): ProviderDiagnostic {
    return this.currentDiagnostic;
  }

  subscribe(listener: (snapshot: OfficeSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private poll(generation: number): Promise<OfficeSnapshot> {
    if (this.polling !== undefined) return this.polling;
    const pending = this.readSnapshot(generation);
    this.polling = pending;
    return pending.finally(() => {
      if (this.polling === pending) this.polling = undefined;
    });
  }

  private async readSnapshot(generation: number): Promise<OfficeSnapshot> {
    const transport = this.transport;
    if (!this.connected || transport === undefined)
      return cloneSnapshot(this.current);
    try {
      const threads = await listPersistedThreads(
        transport,
        this.activeWorkspaceCwd,
      );
      const observedAt = this.now();
      await this.refreshRateLimitsWhenDue(transport, observedAt);
      const hierarchy = buildAgentHierarchy(toHierarchyAgents(threads));
      if (
        generation !== this.generation ||
        !this.connected ||
        transport !== this.transport
      )
        return cloneSnapshot(this.current);
      const sessions = new Set(threads.map((thread) => thread.sessionId));
      const next: OfficeSnapshot = {
        sessionId:
          sessions.size === 1 ? (sessions.values().next().value ?? null) : null,
        updatedAt: observedAt.toISOString(),
        agents: hierarchy.agents,
        rateLimits: this.rateLimits,
        connection:
          hierarchy.unresolved.length === 0 ? "connected" : "degraded",
      };
      this.current = next;
      this.currentDiagnostic = "none";
      this.emit(next);
      return cloneSnapshot(next);
    } catch (error) {
      if (generation === this.generation) {
        this.currentDiagnostic = diagnosticFromError(error);
        if (this.currentDiagnostic === "transport-unavailable") {
          transport.stop();
          if (this.transport === transport) this.transport = undefined;
          this.connected = false;
        }
        this.setDegraded();
      }
      return cloneSnapshot(this.current);
    }
  }

  private setDegraded(): void {
    this.current = { ...this.current, connection: "degraded" };
    this.emit(this.current);
  }

  private emit(snapshot: OfficeSnapshot): void {
    for (const listener of this.listeners) listener(cloneSnapshot(snapshot));
  }

  private async refreshRateLimitsWhenDue(
    transport: CodexRpcTransport,
    observedAt: Date,
  ): Promise<void> {
    const observedAtMs = observedAt.getTime();
    if (
      this.rateLimitsReadAt !== null &&
      observedAtMs - this.rateLimitsReadAt < 60_000
    ) {
      return;
    }
    this.rateLimitsReadAt = observedAtMs;
    try {
      const parsed = accountRateLimitsResponseSchema.safeParse(
        await transport.request("account/rateLimits/read", {}),
      );
      if (parsed.success) this.rateLimits = toAccountRateLimits(parsed.data);
    } catch {
      // Hierarchy remains available when optional account capacity is not.
    }
  }
}

const id = z.string().min(1).max(512);
const cursor = z.string().min(1).max(4096);
const threadStatusSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("notLoaded") }).strip(),
  z.object({ type: z.literal("idle") }).strip(),
  z.object({ type: z.literal("systemError") }).strip(),
  z
    .object({
      type: z.literal("active"),
      activeFlags: z
        .array(z.enum(["waitingOnApproval", "waitingOnUserInput"]))
        .max(2),
    })
    .strip(),
]);
const safeAgentLabel = z
  .string()
  .min(1)
  .max(64)
  .refine((value) => {
    for (const character of value) {
      const point = character.codePointAt(0)!;
      if (point <= 0x1f || (point >= 0x7f && point <= 0x9f)) return false;
    }
    return true;
  });
const threadSpawnSourceSchema = z
  .object({
    subAgent: z
      .object({
        thread_spawn: z
          .object({
            parent_thread_id: id,
            depth: z.number().int().min(1).max(32),
            agent_nickname: safeAgentLabel.nullable(),
            agent_role: safeAgentLabel.nullable(),
          })
          .strip(),
      })
      .strip(),
  })
  .strip();
const sessionSourceSchema = z.union([
  z.enum(["cli", "vscode", "exec", "appServer", "unknown"]),
  z.object({ custom: z.string().max(128) }).strip(),
  z
    .object({ subAgent: z.enum(["review", "compact", "memory_consolidation"]) })
    .strip(),
  z
    .object({
      subAgent: z.object({ other: z.string().max(128) }).strip(),
    })
    .strip(),
  threadSpawnSourceSchema,
]);
const threadListItemSchema = z
  .object({
    id,
    sessionId: id,
    parentThreadId: id.nullable().optional().default(null),
    source: sessionSourceSchema.optional().default("unknown"),
    agentNickname: safeAgentLabel.nullable().optional().default(null),
    agentRole: safeAgentLabel.nullable().optional().default(null),
    createdAt: z.number().int().nonnegative().safe(),
    status: threadStatusSchema,
  })
  .strip();
const threadListSchema = z
  .object({
    data: z.array(threadListItemSchema).max(1_000),
    nextCursor: cursor.nullable().optional().default(null),
  })
  .strip();
const rateLimitWindowSchema = z
  .object({
    usedPercent: z.number().finite().min(0).max(100),
    windowDurationMins: z.number().int().positive().safe().nullable(),
    resetsAt: z.number().int().nonnegative().safe().nullable(),
  })
  .strip();
const rateLimitSnapshotSchema = z
  .object({
    primary: rateLimitWindowSchema.nullable(),
    secondary: rateLimitWindowSchema.nullable(),
  })
  .strip();
const accountRateLimitsResponseSchema = z
  .object({
    rateLimits: rateLimitSnapshotSchema,
  })
  .strip();
type SafeThread = z.infer<typeof threadListItemSchema>;
const DISCOVERY_SOURCE_KINDS = [
  "cli",
  "vscode",
  "exec",
  "appServer",
  "subAgent",
  "subAgentReview",
  "subAgentCompact",
  "subAgentThreadSpawn",
  "subAgentOther",
] as const;

async function listPersistedThreads(
  transport: CodexRpcTransport,
  workspaceCwd?: string,
): Promise<SafeThread[]> {
  const threads = new Map<string, SafeThread>();
  const cursors = new Set<string>();
  let nextCursor: string | null = null;
  for (let page = 0; page < 32; page += 1) {
    const parsed = threadListSchema.safeParse(
      await transport.request("thread/list", {
        cursor: nextCursor,
        limit: 100,
        cwd: workspaceCwd ?? null,
        sourceKinds: DISCOVERY_SOURCE_KINDS,
        useStateDbOnly: true,
      }),
    );
    if (!parsed.success) throw new Error("invalid provider data");
    for (const thread of parsed.data.data) {
      const existing = threads.get(thread.id);
      if (existing !== undefined && !sameSafeThread(existing, thread)) {
        throw new Error("conflicting provider data");
      }
      threads.set(thread.id, thread);
      if (threads.size > 1_000) throw new Error("provider limit");
    }
    nextCursor = parsed.data.nextCursor;
    if (nextCursor === null) return [...threads.values()];
    if (cursors.has(nextCursor)) throw new Error("provider cursor cycle");
    cursors.add(nextCursor);
  }
  throw new Error("provider page limit");
}

function sameSafeThread(left: SafeThread, right: SafeThread): boolean {
  return (
    left.id === right.id &&
    left.sessionId === right.sessionId &&
    left.parentThreadId === right.parentThreadId &&
    JSON.stringify(left.source) === JSON.stringify(right.source) &&
    left.agentNickname === right.agentNickname &&
    left.agentRole === right.agentRole &&
    left.createdAt === right.createdAt &&
    JSON.stringify(left.status) === JSON.stringify(right.status)
  );
}

function toHierarchyAgents(threads: readonly SafeThread[]): HierarchyAgent[] {
  const uniqueSessionById = new Map<string, string | null>();
  for (const thread of threads) {
    const existing = uniqueSessionById.get(thread.id);
    uniqueSessionById.set(
      thread.id,
      existing === undefined || existing === thread.sessionId
        ? thread.sessionId
        : null,
    );
  }
  return threads.map((thread) => {
    const sourceParentId = getThreadSpawnMetadata(thread)?.parent_thread_id;
    const parentId = thread.parentThreadId ?? sourceParentId ?? null;
    const parentSession =
      parentId === null ? thread.sessionId : uniqueSessionById.get(parentId);
    const usesVersionedSpawnFallback =
      thread.parentThreadId === null && sourceParentId !== undefined;
    const spawn = getThreadSpawnMetadata(thread);
    const displayName =
      thread.agentNickname ??
      spawn?.agent_nickname ??
      thread.agentRole ??
      spawn?.agent_role;
    return {
      id: thread.id,
      parentId:
        parentId === null
          ? null
          : usesVersionedSpawnFallback || parentSession === thread.sessionId
            ? parentId
            : "",
      name: "Codex agent",
      ...(displayName === null || displayName === undefined
        ? {}
        : { displayName }),
      task: null,
      status: toAgentStatus(thread.status),
      usage: null,
      startedAt: secondsToCanonicalUtc(thread.createdAt),
    };
  });
}

function getThreadSpawnMetadata(thread: SafeThread):
  | {
      parent_thread_id: string;
      depth: number;
      agent_nickname: string | null;
      agent_role: string | null;
    }
  | undefined {
  const parsed = threadSpawnSourceSchema.safeParse(thread.source);
  return parsed.success ? parsed.data.subAgent.thread_spawn : undefined;
}

function toAgentStatus(status: SafeThread["status"]): AgentStatus {
  switch (status.type) {
    case "active":
      return status.activeFlags.length > 0 ? "waiting-approval" : "thinking";
    case "idle":
      return "idle";
    case "systemError":
      return "failed";
    case "notLoaded":
      return "unknown";
  }
}

function secondsToCanonicalUtc(seconds: number): string | null {
  const milliseconds = seconds * 1_000;
  if (!Number.isSafeInteger(milliseconds)) return null;
  const date = new Date(milliseconds);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toAccountRateLimits(
  response: z.infer<typeof accountRateLimitsResponseSchema>,
): AccountRateLimits {
  return {
    primary: toRateLimitWindow(response.rateLimits.primary),
    secondary: toRateLimitWindow(response.rateLimits.secondary),
    provenance: "reported",
  };
}

function toRateLimitWindow(
  window: z.infer<typeof rateLimitWindowSchema> | null,
): RateLimitWindow | null {
  if (window === null) return null;
  return {
    usedPercent: window.usedPercent,
    windowDurationMinutes: window.windowDurationMins,
    resetsAt:
      window.resetsAt === null ? null : secondsToCanonicalUtc(window.resetsAt),
  };
}

function emptySnapshot(
  connection: OfficeSnapshot["connection"],
): OfficeSnapshot {
  return {
    sessionId: null,
    updatedAt: new Date(0).toISOString(),
    agents: [],
    rateLimits: null,
    connection,
  };
}

function cloneSnapshot(snapshot: OfficeSnapshot): OfficeSnapshot {
  return structuredClone(snapshot);
}

function diagnosticFromError(error: unknown): ProviderDiagnostic {
  if (error instanceof CodexTransportError) {
    return error.code === "executable-not-found"
      ? "executable-unavailable"
      : "transport-unavailable";
  }
  return "invalid-provider-data";
}
