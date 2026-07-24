import * as vscode from "vscode";
import { randomBytes } from "node:crypto";

import {
  parseHostToWebviewMessage,
  parseWebviewToHostMessage,
  projectOfficeSnapshot,
  WEBVIEW_PROTOCOL_VERSION,
  type HostToWebviewMessage,
} from "../protocol/webview";
import { CodexProvider, type AgentProvider } from "../providers/codex/provider";
import type { ProviderDiagnostic } from "../providers/codex/provider";

export class CodexOfficeViewProvider
  implements vscode.WebviewViewProvider, vscode.Disposable
{
  private view?: vscode.WebviewView;
  private messageSubscription?: vscode.Disposable;
  private configurationSubscription?: vscode.Disposable;
  private providerSubscription?: () => void;
  private refreshPromise?: Promise<void>;
  private pollingTimer?: NodeJS.Timeout;
  private sequence = 0;
  private generation = 0;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly provider: AgentProvider = new CodexProvider(
      undefined,
      undefined,
      () => vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
      true,
    ),
  ) {}

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    this.sequence = 0;
    this.messageSubscription?.dispose();
    this.configurationSubscription?.dispose();
    const messageSubscription = view.webview.onDidReceiveMessage(
      (value: unknown) => {
        const parsed = parseWebviewToHostMessage(value);
        if (!parsed.ok) return;

        switch (parsed.message.type) {
          case "ready":
            this.sendInitialState();
            void this.refreshProvider(false);
            this.startPolling();
            break;
          case "refresh":
            this.refresh();
            break;
          case "open-settings":
            void vscode.commands.executeCommand(
              "workbench.action.openSettings",
              "codexOffice",
            );
            break;
          case "select-agent":
            break;
        }
      },
    );
    this.messageSubscription = messageSubscription;
    const configurationSubscription = vscode.workspace.onDidChangeConfiguration(
      (event) => {
        if (event.affectsConfiguration("codexOffice")) this.sendSettings();
      },
    );
    this.configurationSubscription = configurationSubscription;
    view.onDidDispose(() => {
      messageSubscription.dispose();
      configurationSubscription.dispose();
      if (this.view === view) {
        this.generation += 1;
        this.providerSubscription?.();
        this.providerSubscription = undefined;
        this.refreshPromise = undefined;
        this.stopPolling();
        void this.provider.disconnect();
        this.messageSubscription = undefined;
        this.configurationSubscription = undefined;
        this.view = undefined;
      }
    });
    const script = view.webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "dist", "webview.js"),
    );
    const stylesheet = view.webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "dist", "webview.css"),
    );
    const nonce = randomBytes(16).toString("hex");
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };
    view.webview.html = `<!doctype html>
<html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${view.webview.cspSource} data:; style-src ${view.webview.cspSource}; script-src 'nonce-${nonce}';">
<link rel="stylesheet" href="${stylesheet}">
<title>Codex Office</title></head><body><div id="root"></div>
<script nonce="${nonce}" src="${script}"></script></body></html>`;
  }

  refresh(): void {
    this.post({
      protocolVersion: WEBVIEW_PROTOCOL_VERSION,
      sequence: this.nextSequence(),
      type: "refresh-requested",
    });
    void this.refreshProvider(true);
  }

  dispose(): void {
    this.generation += 1;
    this.providerSubscription?.();
    this.providerSubscription = undefined;
    this.refreshPromise = undefined;
    this.stopPolling();
    this.messageSubscription?.dispose();
    this.configurationSubscription?.dispose();
    this.view = undefined;
    void this.provider.disconnect();
  }

  private sendInitialState(): void {
    this.sendSettings();
  }

  private startPolling(): void {
    if (this.pollingTimer !== undefined) return;
    this.pollingTimer = setInterval(() => {
      if (this.view?.visible === true) void this.refreshProvider(true);
    }, 2_000);
  }

  private stopPolling(): void {
    if (this.pollingTimer === undefined) return;
    clearInterval(this.pollingTimer);
    this.pollingTimer = undefined;
  }

  private refreshProvider(force: boolean): Promise<void> {
    if (this.refreshPromise !== undefined) return this.refreshPromise;
    const generation = this.generation;
    const pending = async () => {
      try {
        await this.provider.connect();
        if (this.providerSubscription === undefined) {
          this.providerSubscription = this.provider.subscribe((snapshot) => {
            if (generation === this.generation) this.sendSnapshot(snapshot);
          });
        }
        const snapshot = force
          ? await this.provider.refresh()
          : await this.provider.snapshot();
        if (generation === this.generation) this.sendSnapshot(snapshot);
      } catch {
        if (generation === this.generation)
          this.sendConnection("degraded", "provider-unavailable");
      }
    };
    this.refreshPromise = pending();
    const current = this.refreshPromise;
    return current.finally(() => {
      if (this.refreshPromise === current) this.refreshPromise = undefined;
    });
  }

  private sendSnapshot(
    snapshot: Awaited<ReturnType<AgentProvider["snapshot"]>>,
  ): void {
    const projection = projectOfficeSnapshot(snapshot);
    if (!projection.ok) {
      this.sendConnection("degraded", "invalid-provider-data");
      return;
    }
    this.sendConnection(
      snapshot.connection,
      snapshot.connection === "connected"
        ? null
        : snapshot.connection === "degraded"
          ? providerReason(this.provider.diagnostic())
          : this.provider.diagnostic() === "workspace-required"
            ? "workspace-required"
            : "provider-unavailable",
    );
    this.post({
      protocolVersion: WEBVIEW_PROTOCOL_VERSION,
      sequence: this.nextSequence(),
      type: "snapshot",
      snapshot: projection.snapshot,
    });
  }

  private sendConnection(
    state: "connected" | "disconnected" | "degraded",
    reason:
      | "provider-unavailable"
      | "workspace-required"
      | "provider-executable-unavailable"
      | "provider-transport-unavailable"
      | "unsupported-version"
      | "invalid-provider-data"
      | "usage-unavailable"
      | null,
  ): void {
    this.post({
      protocolVersion: WEBVIEW_PROTOCOL_VERSION,
      sequence: this.nextSequence(),
      type: "connection",
      state,
      reason,
    });
  }

  private sendSettings(): void {
    const configuration = vscode.workspace.getConfiguration("codexOffice");
    this.post({
      protocolVersion: WEBVIEW_PROTOCOL_VERSION,
      sequence: this.nextSequence(),
      type: "settings",
      reducedMotion: configuration.get<boolean>("reducedMotion", false),
    });
  }

  private post(message: HostToWebviewMessage): void {
    const parsed = parseHostToWebviewMessage(message);
    if (!parsed.ok) return;
    void this.view?.webview.postMessage(parsed.message);
  }

  private nextSequence(): number {
    if (this.sequence >= Number.MAX_SAFE_INTEGER) {
      this.messageSubscription?.dispose();
      this.configurationSubscription?.dispose();
      this.messageSubscription = undefined;
      this.configurationSubscription = undefined;
      this.view = undefined;
      return Number.MAX_SAFE_INTEGER;
    }
    this.sequence = Math.min(this.sequence + 1, Number.MAX_SAFE_INTEGER);
    return this.sequence;
  }
}

function providerReason(
  diagnostic: ProviderDiagnostic,
):
  | "provider-executable-unavailable"
  | "workspace-required"
  | "provider-transport-unavailable"
  | "unsupported-version"
  | "invalid-provider-data" {
  switch (diagnostic) {
    case "workspace-required":
      return "workspace-required";
    case "executable-unavailable":
      return "provider-executable-unavailable";
    case "transport-unavailable":
      return "provider-transport-unavailable";
    case "unsupported-version":
      return "unsupported-version";
    case "none":
    case "invalid-provider-data":
      return "invalid-provider-data";
  }
}
