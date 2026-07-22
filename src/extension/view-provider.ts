import * as vscode from "vscode";
import { randomBytes } from "node:crypto";

export class CodexOfficeViewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;

  constructor(private readonly extensionUri: vscode.Uri) {}

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
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
    void this.view?.webview.postMessage({ type: "refresh-requested" });
  }
}
