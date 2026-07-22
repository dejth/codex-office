import type { OfficeSnapshot } from "../../domain/model";

export interface AgentProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  snapshot(): Promise<OfficeSnapshot>;
  subscribe(listener: (snapshot: OfficeSnapshot) => void): () => void;
}

export class CodexProvider implements AgentProvider {
  private listeners = new Set<(snapshot: OfficeSnapshot) => void>();

  async connect(): Promise<void> {
    // CDD-004 defines the protocol investigation required before implementation.
  }

  async disconnect(): Promise<void> {
    this.listeners.clear();
  }

  async snapshot(): Promise<OfficeSnapshot> {
    return {
      sessionId: null,
      updatedAt: new Date().toISOString(),
      agents: [],
      connection: "disconnected",
    };
  }

  subscribe(listener: (snapshot: OfficeSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
