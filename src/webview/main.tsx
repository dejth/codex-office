import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import {
  parseHostToWebviewMessage,
  shouldAcceptHostSequence,
  WEBVIEW_PROTOCOL_VERSION,
  type WebviewToHostMessage,
} from "../protocol/webview";
import "./styles.css";

type ViewMode = "office" | "meter";

declare function acquireVsCodeApi(): {
  postMessage(message: WebviewToHostMessage): void;
};

const vscode = acquireVsCodeApi();

function App(): React.JSX.Element {
  const [mode, setMode] = useState<ViewMode>("office");
  const [announcement, setAnnouncement] = useState("");
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
      <section aria-live="polite" className="empty-state">
        <div className="office-icon" aria-hidden="true">
          ⌂
        </div>
        <h1>
          {mode === "office" ? "The office is quiet" : "No usage to report"}
        </h1>
        <p>Start a Codex task to see agents and reported usage here.</p>
      </section>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </main>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);
