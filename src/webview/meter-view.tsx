import React, { memo, useMemo } from "react";

import type { WebviewAgent } from "../protocol/webview";
import { createUsageMeterModel, type UsageMeterAggregate } from "./usage-meter";

interface MeterViewProps {
  agents: readonly WebviewAgent[];
  selectedId: string | null;
  onSelect(id: string): void;
}

const STATUS_LABELS: Record<WebviewAgent["status"], string> = {
  thinking: "Thinking",
  reading: "Reading",
  editing: "Editing",
  "running-command": "Running command",
  "waiting-approval": "Waiting for approval",
  completed: "Completed",
  failed: "Failed",
  idle: "Idle",
  unknown: "Unknown",
};

const PROVENANCE_LABELS = {
  reported: "Reported",
  derived: "Derived",
  estimated: "Estimated",
} as const;

export function formatTokenValue(value: number | null): string {
  return value === null ? "—" : value.toLocaleString("en-US");
}

function aggregateLabel(aggregate: UsageMeterAggregate): string {
  if (aggregate.overflow) return "Unavailable: safe-integer limit exceeded";
  if (aggregate.unavailableReason === "multiple-thread-snapshots")
    return "Not combined across threads";
  if (aggregate.value === null || aggregate.provenance === null)
    return "Unavailable";
  return `${formatTokenValue(aggregate.value)} tokens, ${PROVENANCE_LABELS[aggregate.provenance].toLowerCase()}`;
}

export const MeterView = memo(function MeterView({
  agents,
  selectedId,
  onSelect,
}: MeterViewProps): React.JSX.Element {
  const model = useMemo(() => createUsageMeterModel(agents), [agents]);
  const total = model.summary.usage.total;

  return (
    <section className="meter-view" aria-labelledby="meter-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Thread snapshots</p>
          <h1 id="meter-heading">Reported usage</h1>
        </div>
        <span className="preview-badge">Not billing data</span>
      </div>
      <p className="view-summary">
        Values are reported per visible thread. Parent and child context may
        overlap, so totals are not quota or cost.
      </p>

      <div className="meter-summary" aria-label="Usage summary">
        <div className="meter-total">
          <span>Cross-thread total</span>
          <strong>{formatTokenValue(total.value)}</strong>
          <small>{aggregateLabel(total)}</small>
        </div>
        <dl className="meter-counts">
          <div>
            <dt>Main</dt>
            <dd>{model.summary.mainAgents}</dd>
          </div>
          <div>
            <dt>Subagents</dt>
            <dd>{model.summary.subagents}</dd>
          </div>
          <div>
            <dt>Threads</dt>
            <dd>{model.summary.visibleThreads}</dd>
          </div>
        </dl>
      </div>

      {model.rows.length === 0 ? (
        <p className="meter-empty">No reported usage is available.</p>
      ) : (
        <ul className="meter-list" aria-label="Per-thread reported usage">
          {model.rows.map((row) => {
            const provenance = row.usage?.provenance ?? null;
            return (
              <li key={row.id} data-depth={Math.min(row.depth, 3)}>
                <button
                  type="button"
                  className="meter-row"
                  aria-pressed={selectedId === row.id}
                  aria-label={`${row.name}, hierarchy level ${row.depth + 1}, ${STATUS_LABELS[row.status]}, ${row.usage?.total === null || row.usage === null ? "usage unavailable" : `${formatTokenValue(row.usage.total)} tokens, ${PROVENANCE_LABELS[row.usage.provenance].toLowerCase()}`}`}
                  onClick={() => onSelect(row.id)}
                >
                  <span className="meter-agent">
                    <strong>{row.name}</strong>
                    <small>{STATUS_LABELS[row.status]}</small>
                  </span>
                  <span className="meter-value">
                    <strong>
                      {formatTokenValue(row.usage?.total ?? null)}
                    </strong>
                    <small
                      className={
                        provenance === null
                          ? "provenance-unavailable"
                          : `provenance-${provenance}`
                      }
                    >
                      {provenance === null
                        ? "Unavailable"
                        : PROVENANCE_LABELS[provenance]}
                    </small>
                  </span>
                </button>
                <details className="meter-components">
                  <summary>Components</summary>
                  <dl>
                    <div>
                      <dt>Input</dt>
                      <dd>{formatTokenValue(row.usage?.input ?? null)}</dd>
                    </div>
                    <div>
                      <dt>Cached input</dt>
                      <dd>
                        {formatTokenValue(row.usage?.cachedInput ?? null)}
                      </dd>
                    </div>
                    <div>
                      <dt>Output</dt>
                      <dd>{formatTokenValue(row.usage?.output ?? null)}</dd>
                    </div>
                  </dl>
                </details>
              </li>
            );
          })}
        </ul>
      )}

      <details className="provenance-note">
        <summary>How to read these numbers</summary>
        <p>
          <strong>Reported</strong> comes from Codex for one thread.{" "}
          <strong>Derived</strong> is deterministic arithmetic over compatible
          values. <strong>Estimated</strong> is heuristic and visually marked.
          Missing values remain — rather than becoming zero.
        </p>
      </details>
    </section>
  );
});
