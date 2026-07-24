import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import {
  parseHostToWebviewMessage,
  shouldAcceptHostSequence,
  WEBVIEW_PROTOCOL_VERSION,
  type WebviewSnapshot,
  type WebviewToHostMessage,
} from "../protocol/webview";
import "./styles.css";
import { ConnectionNotice } from "./connection-notice";
import { OfficeView } from "./office-view";
import { AccountOverview } from "./meter-view";
import {
  replaceConnection,
  replaceConnectionFromSnapshot,
  replaceSnapshot,
  type ConnectionState,
} from "./state";

declare function acquireVsCodeApi(): {
  postMessage(message: WebviewToHostMessage): void;
};

const vscode = acquireVsCodeApi();
const INITIAL_SNAPSHOT: WebviewSnapshot = {
  id: "snapshot_initial",
  updatedAt: "1970-01-01T00:00:00.000Z",
  agents: [],
  rateLimits: null,
  unresolved: [],
  connection: "disconnected",
};

function App(): React.JSX.Element {
  const [announcement, setAnnouncement] = useState("");
  const [snapshot, setSnapshot] = useState<WebviewSnapshot>(INITIAL_SNAPSHOT);
  const [connection, setConnection] = useState<ConnectionState>({
    state: "disconnected",
    reason: null,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const lastSequenceByType = useRef(new Map<string, number>());

  useEffect(() => {
    const onMessage = (event: MessageEvent<unknown>): void => {
      const parsed = parseHostToWebviewMessage(event.data);
      if (!parsed.ok) return;

      const lastSequence = lastSequenceByType.current.get(parsed.message.type);
      if (!shouldAcceptHostSequence(lastSequence, parsed.message.sequence))
        return;
      lastSequenceByType.current.set(
        parsed.message.type,
        parsed.message.sequence,
      );

      if (parsed.message.type === "settings") {
        setReducedMotion(parsed.message.reducedMotion);
      } else if (parsed.message.type === "snapshot") {
        const nextSnapshot = parsed.message.snapshot;
        setSnapshot((current) => replaceSnapshot(current, nextSnapshot));
        setConnection((current) =>
          replaceConnectionFromSnapshot(current, nextSnapshot.connection),
        );
      } else if (parsed.message.type === "connection") {
        const nextConnection = {
          state: parsed.message.state,
          reason: parsed.message.reason,
        };
        setConnection((current) => replaceConnection(current, nextConnection));
      } else if (parsed.message.type === "refresh-requested") {
        setAnnouncement(`Refreshing Codex Office ${parsed.message.sequence}`);
      }
    };

    window.addEventListener("message", onMessage);
    vscode.postMessage({
      protocolVersion: WEBVIEW_PROTOCOL_VERSION,
      type: "ready",
    });
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const selectAgent = useCallback((agentId: string): void => {
    setSelectedId(agentId);
    vscode.postMessage({
      protocolVersion: WEBVIEW_PROTOCOL_VERSION,
      type: "select-agent",
      agentId,
    });
  }, []);

  return (
    <main>
      <header>
        <strong>Codex Office</strong>
      </header>
      <ConnectionNotice state={connection.state} reason={connection.reason} />
      <AccountOverview
        agents={snapshot.agents}
        rateLimits={snapshot.rateLimits}
      />
      <OfficeView
        agents={snapshot.agents}
        reducedMotion={reducedMotion}
        selectedId={selectedId}
        onSelect={selectAgent}
        connection={connection.state}
      />
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </main>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);
