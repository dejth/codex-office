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

export interface RateLimitWindow {
  usedPercent: number;
  windowDurationMinutes: number | null;
  resetsAt: string | null;
}

export interface AccountRateLimits {
  primary: RateLimitWindow | null;
  secondary: RateLimitWindow | null;
  provenance: "reported";
}

export interface AgentNode {
  id: string;
  parentId: string | null;
  name: string;
  displayName?: string;
  task: string | null;
  status: AgentStatus;
  lastActivityAt: string | null;
  usage: TokenUsage | null;
  children: AgentNode[];
}

export interface OfficeSnapshot {
  sessionId: string | null;
  updatedAt: string;
  agents: AgentNode[];
  rateLimits: AccountRateLimits | null;
  connection: "connected" | "disconnected" | "degraded";
}
