import * as vscode from "vscode";
import { CodexProvider } from "../providers/codex/provider";
import { CodexOfficeViewProvider } from "./view-provider";

export function activate(context: vscode.ExtensionContext): void {
  const workspaceCwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  const provider = new CodexOfficeViewProvider(
    context.extensionUri,
    new CodexProvider(undefined, undefined, workspaceCwd),
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
