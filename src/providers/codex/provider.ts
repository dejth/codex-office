import { z } from "zod";

import {
  buildAgentHierarchy,
  type HierarchyAgent,
} from "../../domain/hierarchy";
import type { AgentStatus, OfficeSnapshot } from "../../domain/model";
import { negotiateCodexCapabilities } from "./capabilities";
import { CodexStdioTransport, type CodexRpcTransport } from "./transport";

export interface AgentProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  snapshot(): Promise<OfficeSnapshot>;
  refresh(): Promise<OfficeSnapshot>;
  subscribe(listener: (snapshot: OfficeSnapshot) => void): () => void;
}

export class CodexProvider implements AgentProvider {
  private listeners = new Set<(snapshot: OfficeSnapshot) => void>();
  private transport: CodexRpcTransport | undefined;
  private connected = false;
  private polling: Promise<OfficeSnapshot> | undefined;
  private current = emptySnapshot("disconnected");
  private generation = 0;

  constructor(
    private readonly createTransport: () => CodexRpcTransport = () =>
      new CodexStdioTransport(),
    private readonly now: () => Date = () => new Date(),
  ) {}

  async connect(): Promise<void> {
    if (this.transport !== undefined) return;
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
        this.setDegraded();
        transport.stop();
        this.transport = undefined;
        return;
      }
      transport.notify("initialized");
      this.connected = true;
      await this.poll(generation);
    } catch {
      transport.stop();
      if (generation === this.generation && transport === this.transport) {
        this.transport = undefined;
        this.connected = false;
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
    this.current = { ...this.current, connection: "disconnected" };
  }

  async snapshot(): Promise<OfficeSnapshot> {
    return cloneSnapshot(this.current);
  }

  async refresh(): Promise<OfficeSnapshot> {
    return this.connected
      ? this.poll(this.generation)
      : cloneSnapshot(this.current);
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
      const threadIds = await listLoadedThreadIds(transport);
      const threads = await Promise.all(
        threadIds.map(async (threadId) => {
          const thread = parseThreadRead(
            await transport.request("thread/read", {
              threadId,
              includeTurns: false,
            }),
          );
          if (thread.id !== threadId) throw new Error("provider id mismatch");
          return thread;
        }),
      );
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
        updatedAt: this.now().toISOString(),
        agents: hierarchy.agents,
        connection:
          hierarchy.unresolved.length === 0 ? "connected" : "degraded",
      };
      this.current = next;
      this.emit(next);
      return cloneSnapshot(next);
    } catch {
      if (generation === this.generation) this.setDegraded();
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
}

const id = z.string().min(1).max(512);
const cursor = z.string().min(1).max(4096);
const loadedListSchema = z
  .object({
    data: z.array(id).max(1_000),
    nextCursor: cursor.nullable(),
  })
  .strip();
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
const threadReadSchema = z
  .object({
    thread: z
      .object({
        id,
        sessionId: id,
        parentThreadId: id.nullable(),
        createdAt: z.number().int().nonnegative().safe(),
        status: threadStatusSchema,
      })
      .strip(),
  })
  .strip();

type SafeThread = z.infer<typeof threadReadSchema>["thread"];

async function listLoadedThreadIds(
  transport: CodexRpcTransport,
): Promise<string[]> {
  const ids = new Set<string>();
  const cursors = new Set<string>();
  let nextCursor: string | null = null;
  for (let page = 0; page < 32; page += 1) {
    const parsed = loadedListSchema.safeParse(
      await transport.request("thread/loaded/list", {
        cursor: nextCursor,
        limit: 100,
      }),
    );
    if (!parsed.success) throw new Error("invalid provider data");
    for (const threadId of parsed.data.data) {
      ids.add(threadId);
      if (ids.size > 1_000) throw new Error("provider limit");
    }
    nextCursor = parsed.data.nextCursor;
    if (nextCursor === null) return [...ids];
    if (cursors.has(nextCursor)) throw new Error("provider cursor cycle");
    cursors.add(nextCursor);
  }
  throw new Error("provider page limit");
}

function parseThreadRead(value: unknown): SafeThread {
  const parsed = threadReadSchema.safeParse(value);
  if (!parsed.success) throw new Error("invalid provider data");
  return parsed.data.thread;
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
    const parentSession =
      thread.parentThreadId === null
        ? thread.sessionId
        : uniqueSessionById.get(thread.parentThreadId);
    return {
      id: thread.id,
      parentId: parentSession === thread.sessionId ? thread.parentThreadId : "",
      name: "Codex agent",
      task: null,
      status: toAgentStatus(thread.status),
      usage: null,
      startedAt: secondsToCanonicalUtc(thread.createdAt),
    };
  });
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

function emptySnapshot(
  connection: OfficeSnapshot["connection"],
): OfficeSnapshot {
  return {
    sessionId: null,
    updatedAt: new Date(0).toISOString(),
    agents: [],
    connection,
  };
}

function cloneSnapshot(snapshot: OfficeSnapshot): OfficeSnapshot {
  return structuredClone(snapshot);
}
