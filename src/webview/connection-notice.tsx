import React from "react";

import type { WebviewSnapshot } from "../protocol/webview";
import type { ConnectionReason } from "./state";

const REASON_MESSAGES: Partial<Record<NonNullable<ConnectionReason>, string>> =
  {
    "workspace-required":
      "Open a workspace folder to show only its local Codex sessions.",
    "provider-executable-unavailable":
      "Codex executable was not found. Install Codex CLI or use a supported Codex installation.",
    "provider-transport-unavailable":
      "The Codex provider stopped responding. Reconnecting…",
    "unsupported-version":
      "This Codex runtime could not be verified. Workspace inventory supports compatible runtimes; live status currently requires verified Codex 0.146.0.",
    "invalid-provider-data":
      "Codex returned invalid provider data. Showing the last safe snapshot.",
  };

export function ConnectionNotice({
  state,
  reason,
}: {
  state: WebviewSnapshot["connection"];
  reason: ConnectionReason;
}): React.JSX.Element | null {
  if (state === "connected") return null;
  const reasonMessage = reason ? REASON_MESSAGES[reason] : undefined;
  return (
    <p className="connection-notice" role="status">
      {reasonMessage ??
        (state === "degraded"
          ? "Codex connection is degraded. Showing the last safe snapshot."
          : "Codex is disconnected. Waiting for a local provider.")}
    </p>
  );
}
