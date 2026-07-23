import type {
  HostToWebviewMessage,
  WebviewSnapshot,
} from "../protocol/webview";

export type ConnectionReason = Extract<
  HostToWebviewMessage,
  { type: "connection" }
>["reason"];

export interface ConnectionState {
  state: WebviewSnapshot["connection"];
  reason: ConnectionReason;
}

/** Snapshot messages are authoritative, including an empty agent list. */
export function replaceSnapshot(
  _current: WebviewSnapshot,
  next: WebviewSnapshot,
): WebviewSnapshot {
  return next;
}

export function replaceConnection(
  _current: ConnectionState,
  next: ConnectionState,
): ConnectionState {
  return next;
}

export function replaceConnectionFromSnapshot(
  current: ConnectionState,
  nextState: WebviewSnapshot["connection"],
): ConnectionState {
  return {
    state: nextState,
    reason: nextState === "connected" ? null : current.reason,
  };
}
