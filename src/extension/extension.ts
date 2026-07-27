import * as vscode from "vscode";
import {
  CodexProvider,
  type ProviderLifecycleEvent,
} from "../providers/codex/provider";
import {
  CodexStdioTransport,
  CodexUnixSocketTransport,
} from "../providers/codex/transport";
import { CodexOfficeViewProvider } from "./view-provider";

export function activate(context: vscode.ExtensionContext): void {
  const diagnostics = vscode.window.createOutputChannel("Codex Office", {
    log: true,
  });
  const useSharedAppServer = (): boolean =>
    vscode.workspace
      .getConfiguration("codexOffice")
      .get<boolean>("experimentalSharedAppServer", false);
  const reportLifecycle = (event: ProviderLifecycleEvent): void => {
    const suffix =
      event.stage === "connect-failed"
        ? `:${event.diagnostic}${event.transportCode === undefined ? "" : `:${event.transportCode}`}`
        : "";
    diagnostics.info(`${event.source}:${event.stage}${suffix}`);
  };
  diagnostics.info(
    `shared-setting:${useSharedAppServer() ? "enabled" : "disabled"}`,
  );
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
      () => new CodexStdioTransport(),
      reportLifecycle,
    ),
  );
  context.subscriptions.push(
    diagnostics,
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
