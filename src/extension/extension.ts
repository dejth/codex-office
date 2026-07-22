import * as vscode from "vscode";
import { CodexOfficeViewProvider } from "./view-provider";

export function activate(context: vscode.ExtensionContext): void {
  const provider = new CodexOfficeViewProvider(context.extensionUri);
  context.subscriptions.push(
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
