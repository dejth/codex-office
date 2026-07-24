import React, { memo, useMemo } from "react";

import type { WebviewAgent, WebviewSnapshot } from "../protocol/webview";
import { createUsageMeterModel } from "./usage-meter";

interface AccountOverviewProps {
  agents: readonly WebviewAgent[];
  rateLimits: WebviewSnapshot["rateLimits"];
}

function formatWindowDuration(minutes: number | null, index: number): string {
  if (minutes === null)
    return index === 0 ? "Primary window" : "Secondary window";
  if (minutes % 10_080 === 0) return `${minutes / 10_080}-week window`;
  if (minutes % 1_440 === 0) return `${minutes / 1_440}-day window`;
  if (minutes % 60 === 0) return `${minutes / 60}-hour window`;
  return `${minutes}-minute window`;
}

function formatReset(timestamp: string | null): string {
  if (timestamp === null) return "Reset unavailable";
  return `Resets ${new Date(timestamp).toLocaleString()}`;
}

export const AccountOverview = memo(function AccountOverview({
  agents,
  rateLimits,
}: AccountOverviewProps): React.JSX.Element {
  const model = useMemo(() => createUsageMeterModel(agents), [agents]);
  const capacityWindows =
    rateLimits === null
      ? []
      : [rateLimits.primary, rateLimits.secondary].filter(
          (window): window is NonNullable<typeof window> => window !== null,
        );

  return (
    <section className="account-overview" aria-labelledby="account-heading">
      <div className="account-overview-heading">
        <div>
          <p className="eyebrow">Local Codex account</p>
          <h1 id="account-heading">Usage</h1>
        </div>
        <span className="preview-badge">Not billing data</span>
      </div>
      <p className="account-disclaimer">
        Reported account limits from the local Codex provider. Not token billing
        or cost.
      </p>

      {capacityWindows.length === 0 ? (
        <p className="account-capacity-unavailable">
          Account capacity unavailable
        </p>
      ) : (
        <div className="compact-capacity-list">
          {capacityWindows.map((window, index) => {
            const label = formatWindowDuration(
              window.windowDurationMinutes,
              index,
            );
            return (
              <div className="compact-capacity" key={`${label}-${index}`}>
                <div className="compact-capacity-label">
                  <span>{label}</span>
                  <strong>{window.usedPercent}% used</strong>
                </div>
                <progress
                  aria-label={`${label}, ${window.usedPercent}% used`}
                  max={100}
                  value={window.usedPercent}
                />
                <small>{formatReset(window.resetsAt)}</small>
              </div>
            );
          })}
        </div>
      )}

      <dl className="compact-account-counts" aria-label="Session summary">
        <div>
          <dt>Root sessions</dt>
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
    </section>
  );
});
