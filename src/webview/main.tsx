import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import {
  parseHostToWebviewMessage,
  shouldAcceptHostSequence,
  WEBVIEW_PROTOCOL_VERSION,
  type WebviewSnapshot,
  type WebviewToHostMessage,
} from "../protocol/webview";
import { previewSnapshot } from "../protocol/preview-fixture";
import "./styles.css";
import { AgentTree } from "./agent-tree";
import { replaceSnapshot } from "./state";

type ViewMode = "office" | "meter";

declare function acquireVsCodeApi(): {
  postMessage(message: WebviewToHostMessage): void;
};

const vscode = acquireVsCodeApi();

function App(): React.JSX.Element {
  const [mode, setMode] = useState<ViewMode>("office");
  const [announcement, setAnnouncement] = useState("");
  const [snapshot, setSnapshot] = useState<WebviewSnapshot>(previewSnapshot);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
        setMode(parsed.message.defaultView);
      } else if (parsed.message.type === "snapshot") {
        const nextSnapshot = parsed.message.snapshot;
        setSnapshot((current) => replaceSnapshot(current, nextSnapshot));
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

  const selectMode = (view: ViewMode): void => {
    setMode(view);
    vscode.postMessage({
      protocolVersion: WEBVIEW_PROTOCOL_VERSION,
      type: "set-view",
      view,
    });
  };

  const selectAgent = (agentId: string): void => {
    setSelectedId(agentId);
    vscode.postMessage({
      protocolVersion: WEBVIEW_PROTOCOL_VERSION,
      type: "select-agent",
      agentId,
    });
  };

  return (
    <main>
      <header>
        <strong>Codex Office</strong>
        <nav aria-label="View mode">
          <button
            aria-pressed={mode === "office"}
            onClick={() => selectMode("office")}
          >
            Office
          </button>
          <button
            aria-pressed={mode === "meter"}
            onClick={() => selectMode("meter")}
          >
            Meter
          </button>
        </nav>
      </header>
      {mode === "office" ? (
        <section className="office-view" aria-labelledby="office-heading">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Fixture preview</p>
              <h1 id="office-heading">Agent hierarchy</h1>
            </div>
            <span className="preview-badge">Synthetic data</span>
          </div>
          <p className="view-summary">
            Navigate with arrow keys. Press Enter or Space to select an agent.
          </p>
          <AgentTree
            agents={snapshot.agents}
            selectedId={selectedId}
            onSelect={selectAgent}
          />
        </section>
      ) : (
        <section aria-live="polite" className="empty-state">
          <div className="office-icon" aria-hidden="true">
            ◫
          </div>
          <h1>Meter arrives in Issue #8</h1>
          <p>Your agent selection is preserved when you return to Office.</p>
        </section>
      )}
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </main>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);
