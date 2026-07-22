import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type ViewMode = "office" | "meter";

function App(): React.JSX.Element {
  const [mode, setMode] = useState<ViewMode>("office");
  return (
    <main>
      <header>
        <strong>Codex Office</strong>
        <nav aria-label="View mode">
          <button
            aria-pressed={mode === "office"}
            onClick={() => setMode("office")}
          >
            Office
          </button>
          <button
            aria-pressed={mode === "meter"}
            onClick={() => setMode("meter")}
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
    </main>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);
