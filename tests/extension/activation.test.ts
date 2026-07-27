import { afterEach, describe, expect, it, vi } from "vitest";

const configuration = vi.hoisted(() => ({ sharedAppServer: false }));

const vscodeMock = vi.hoisted(() => ({
  createOutputChannel: vi.fn(() => ({
    info: vi.fn(),
    dispose: vi.fn(),
  })),
  registerWebviewViewProvider: vi.fn((...args: [string, unknown]) => {
    void args;
    return { dispose: vi.fn() };
  }),
  registerCommand: vi.fn(() => ({ dispose: vi.fn() })),
  executeCommand: vi.fn(),
  getConfiguration: vi.fn(() => ({
    get: vi.fn((key: string, fallback: unknown) =>
      key === "experimentalSharedAppServer"
        ? configuration.sharedAppServer
        : fallback,
    ),
  })),
}));

vi.mock("vscode", () => ({
  window: {
    createOutputChannel: vscodeMock.createOutputChannel,
    registerWebviewViewProvider: vscodeMock.registerWebviewViewProvider,
  },
  commands: {
    registerCommand: vscodeMock.registerCommand,
    executeCommand: vscodeMock.executeCommand,
  },
  workspace: {
    workspaceFolders: [{ uri: { fsPath: "/synthetic/workspace" } }],
    onDidChangeConfiguration: vi.fn(),
    getConfiguration: vscodeMock.getConfiguration,
  },
  Uri: { joinPath: vi.fn() },
}));

import { activate } from "../../src/extension/extension";
import {
  CodexStdioTransport,
  CodexUnixSocketTransport,
} from "../../src/providers/codex/transport";

describe("extension activation", () => {
  afterEach(() => {
    configuration.sharedAppServer = false;
    vi.clearAllMocks();
  });

  it("registers the sidebar, commands, and provider disposal", () => {
    const context = {
      extensionUri: {},
      subscriptions: [] as Array<{ dispose(): unknown }>,
    };

    activate(context as never);

    expect(vscodeMock.registerWebviewViewProvider).toHaveBeenCalledWith(
      "codexOffice.sidebar",
      expect.anything(),
    );
    const registered = vscodeMock.registerWebviewViewProvider.mock
      .calls[0]?.[1] as
      | {
          provider?: {
            workspaceCwd?: () => string | undefined;
            requireWorkspace?: boolean;
            createFallbackTransport?: () => unknown;
          };
        }
      | undefined;
    expect(registered?.provider?.workspaceCwd?.()).toBe("/synthetic/workspace");
    expect(registered?.provider?.requireWorkspace).toBe(true);
    expect(registered?.provider?.createFallbackTransport).toEqual(
      expect.any(Function),
    );
    expect(vscodeMock.registerCommand).toHaveBeenCalledTimes(2);
    expect(vscodeMock.createOutputChannel).toHaveBeenCalledWith(
      "Codex Office",
      { log: true },
    );
    expect(context.subscriptions).toHaveLength(5);
  });

  it("honors shared observer intent and leaves socket validation to the transport", () => {
    configuration.sharedAppServer = true;
    const context = {
      extensionUri: {},
      subscriptions: [] as Array<{ dispose(): unknown }>,
    };

    activate(context as never);

    const registered = vscodeMock.registerWebviewViewProvider.mock
      .calls[0]?.[1] as
      | {
          provider?: {
            createTransport?: () => unknown;
            createFallbackTransport?: () => unknown;
            sharedAppServer?: () => boolean;
          };
        }
      | undefined;
    expect(registered?.provider?.sharedAppServer?.()).toBe(true);
    expect(registered?.provider?.createTransport?.()).toBeInstanceOf(
      CodexUnixSocketTransport,
    );
    expect(registered?.provider?.createFallbackTransport?.()).toBeInstanceOf(
      CodexStdioTransport,
    );
  });
});
