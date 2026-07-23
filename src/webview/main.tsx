import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { OfficeView } from "./office-view";
import { MeterView } from "./meter-view";
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
        setMode(parsed.message.defaultView);
        setReducedMotion(parsed.message.reducedMotion);
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
        <>
          <OfficeView
            agents={snapshot.agents}
            reducedMotion={reducedMotion}
            selectedId={selectedId}
            onSelect={selectAgent}
          />
          <div className="tree-fallback">
            <h2>Accessible agent list</h2>
            <p className="view-summary">
              Navigate with arrow keys. Press Enter or Space to select.
            </p>
            <AgentTree
              agents={snapshot.agents}
              selectedId={selectedId}
              onSelect={selectAgent}
            />
          </div>
        </>
      ) : (
        <MeterView
          agents={snapshot.agents}
          selectedId={selectedId}
          onSelect={selectAgent}
        />
      )}
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </main>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);
