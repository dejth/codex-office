export type AgentStatus =
  | "thinking"
  | "reading"
  | "editing"
  | "running-command"
  | "waiting-approval"
  | "completed"
  | "failed"
  | "idle"
  | "unknown";

export type UsageProvenance = "reported" | "derived" | "estimated";

export interface TokenUsage {
  input: number | null;
  cachedInput: number | null;
  output: number | null;
  total: number | null;
  provenance: UsageProvenance;
}

export interface AgentNode {
  id: string;
  parentId: string | null;
  name: string;
  task: string | null;
  status: AgentStatus;
  usage: TokenUsage | null;
  children: AgentNode[];
}

export interface OfficeSnapshot {
  sessionId: string | null;
  updatedAt: string;
  agents: AgentNode[];
  connection: "connected" | "disconnected" | "degraded";
}
