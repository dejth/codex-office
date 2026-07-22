import * as vscode from "vscode";
import { randomBytes } from "node:crypto";

import {
  parseHostToWebviewMessage,
  parseWebviewToHostMessage,
  WEBVIEW_PROTOCOL_VERSION,
  type HostToWebviewMessage,
} from "../protocol/webview";
import { previewSnapshot } from "../protocol/preview-fixture";

export class CodexOfficeViewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private messageSubscription?: vscode.Disposable;
  private sequence = 0;

  constructor(private readonly extensionUri: vscode.Uri) {}

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    this.sequence = 0;
    this.messageSubscription?.dispose();
    const messageSubscription = view.webview.onDidReceiveMessage(
      (value: unknown) => {
        const parsed = parseWebviewToHostMessage(value);
        if (!parsed.ok) return;

        switch (parsed.message.type) {
          case "ready":
            this.sendInitialState();
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
          case "set-view":
            break;
        }
      },
    );
    this.messageSubscription = messageSubscription;
    view.onDidDispose(() => {
      messageSubscription.dispose();
      if (this.view === view) {
        this.messageSubscription = undefined;
        this.view = undefined;
      }
    });
    const script = view.webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "dist", "webview.js"),
    );
    const nonce = randomBytes(16).toString("hex");
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };
    view.webview.html = `<!doctype html>
<html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${view.webview.cspSource} data:; style-src ${view.webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
<title>Codex Office</title></head><body><div id="root"></div>
<script nonce="${nonce}" src="${script}"></script></body></html>`;
  }

  refresh(): void {
    this.post({
      protocolVersion: WEBVIEW_PROTOCOL_VERSION,
      sequence: this.nextSequence(),
      type: "refresh-requested",
    });
  }

  private sendInitialState(): void {
    const configuration = vscode.workspace.getConfiguration("codexOffice");
    const configuredView = configuration.get<string>("defaultView");
    const defaultView = configuredView === "meter" ? "meter" : "office";

    this.post({
      protocolVersion: WEBVIEW_PROTOCOL_VERSION,
      sequence: this.nextSequence(),
      type: "settings",
      defaultView,
      reducedMotion: configuration.get<boolean>("reducedMotion", false),
    });
    this.post({
      protocolVersion: WEBVIEW_PROTOCOL_VERSION,
      sequence: this.nextSequence(),
      type: "connection",
      state: "disconnected",
      reason: "provider-unavailable",
    });
    this.post({
      protocolVersion: WEBVIEW_PROTOCOL_VERSION,
      sequence: this.nextSequence(),
      type: "snapshot",
      snapshot: previewSnapshot,
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
      this.messageSubscription = undefined;
      this.view = undefined;
      return Number.MAX_SAFE_INTEGER;
    }
    this.sequence = Math.min(this.sequence + 1, Number.MAX_SAFE_INTEGER);
    return this.sequence;
  }
}
