import { describe, expect, it, vi } from "vitest";

const vscodeMock = vi.hoisted(() => ({
  registerWebviewViewProvider: vi.fn(() => ({ dispose: vi.fn() })),
  registerCommand: vi.fn(() => ({ dispose: vi.fn() })),
  executeCommand: vi.fn(),
}));

vi.mock("vscode", () => ({
  window: {
    registerWebviewViewProvider: vscodeMock.registerWebviewViewProvider,
  },
  commands: {
    registerCommand: vscodeMock.registerCommand,
    executeCommand: vscodeMock.executeCommand,
  },
  workspace: {
    onDidChangeConfiguration: vi.fn(),
    getConfiguration: vi.fn(),
  },
  Uri: { joinPath: vi.fn() },
}));

import { activate } from "../../src/extension/extension";

describe("extension activation", () => {
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
    expect(vscodeMock.registerCommand).toHaveBeenCalledTimes(2);
    expect(context.subscriptions).toHaveLength(4);
  });
});
