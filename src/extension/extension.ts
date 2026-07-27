import * as vscode from "vscode";
import { CodexProvider } from "../providers/codex/provider";
import {
  CodexStdioTransport,
  CodexUnixSocketTransport,
  isSecureCodexSharedSocket,
} from "../providers/codex/transport";
import { CodexOfficeViewProvider } from "./view-provider";

export function activate(context: vscode.ExtensionContext): void {
  const useSharedAppServer = (): boolean =>
    vscode.workspace
      .getConfiguration("codexOffice")
      .get<boolean>("experimentalSharedAppServer", false) &&
    isSecureCodexSharedSocket();
  const provider = new CodexOfficeViewProvider(
    context.extensionUri,
    new CodexProvider(
      () =>
        useSharedAppServer()
          ? new CodexUnixSocketTransport()
          : new CodexStdioTransport(),
      undefined,
      () => vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
      true,
      useSharedAppServer,
    ),
  );
  context.subscriptions.push(
    provider,
    vscode.window.registerWebviewViewProvider("codexOffice.sidebar", provider),
    vscode.commands.registerCommand("codexOffice.refresh", () =>
      provider.refresh(),
    ),
    vscode.commands.registerCommand("codexOffice.openSettings", () =>
      vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "codexOffice",
      ),
    ),
  );
}

export function deactivate(): void {}
