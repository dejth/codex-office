import React from "react";

import type { WebviewSnapshot } from "../protocol/webview";

export function ConnectionNotice({
  state,
}: {
  state: WebviewSnapshot["connection"];
}): React.JSX.Element | null {
  if (state === "connected") return null;
  return (
    <p className="connection-notice" role="status">
      {state === "degraded"
        ? "Codex connection is degraded. Showing the last safe snapshot."
        : "Codex is disconnected. Waiting for a local provider."}
    </p>
  );
}
