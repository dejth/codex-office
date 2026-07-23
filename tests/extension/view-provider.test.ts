import { beforeEach, describe, expect, it, vi } from "vitest";

import type { OfficeSnapshot } from "../../src/domain/model";
import type {
  AgentProvider,
  ProviderDiagnostic,
} from "../../src/providers/codex/provider";

const vscodeMock = vi.hoisted(() => ({
  executeCommand: vi.fn(),
  onDidChangeConfiguration: vi.fn(() => ({ dispose: vi.fn() })),
  getConfiguration: vi.fn(() => ({
    get: vi.fn((_key: string, fallback?: unknown) => fallback),
  })),
  joinPath: vi.fn((_root: unknown, ...parts: string[]) => parts.join("/")),
}));

vi.mock("vscode", () => ({
  commands: { executeCommand: vscodeMock.executeCommand },
  workspace: {
    onDidChangeConfiguration: vscodeMock.onDidChangeConfiguration,
    getConfiguration: vscodeMock.getConfiguration,
  },
  Uri: { joinPath: vscodeMock.joinPath },
}));

import { CodexOfficeViewProvider } from "../../src/extension/view-provider";

const empty: OfficeSnapshot = {
  sessionId: null,
  updatedAt: "2026-01-01T00:00:00.000Z",
  agents: [],
  connection: "connected",
};

class FakeProvider implements AgentProvider {
  connect = vi.fn(async () => undefined);
  disconnect = vi.fn(async () => undefined);
  snapshot = vi.fn(async () => structuredClone(empty));
  refresh = vi.fn(async () => structuredClone(empty));
  diagnostic = vi.fn<() => ProviderDiagnostic>(() => "none");
  private listener?: (snapshot: OfficeSnapshot) => void;
  subscribe = vi.fn((listener: (snapshot: OfficeSnapshot) => void) => {
    this.listener = listener;
    return () => {
      this.listener = undefined;
    };
  });
}

function createView() {
  let receive: ((message: unknown) => void) | undefined;
  let dispose: (() => void) | undefined;
  const posted: unknown[] = [];
  const view = {
    visible: true,
    webview: {
      cspSource: "test-csp",
      options: {},
      html: "",
      asWebviewUri: (value: unknown) => String(value),
      onDidReceiveMessage: (listener: (message: unknown) => void) => {
        receive = listener;
        return { dispose: vi.fn() };
      },
      postMessage: (message: unknown) => {
        posted.push(message);
        return Promise.resolve(true);
      },
    },
    onDidDispose: (listener: () => void) => {
      dispose = listener;
      return { dispose: vi.fn() };
    },
  };
  return {
    view,
    posted,
    receive: (message: unknown) => receive?.(message),
    dispose: () => dispose?.(),
  };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("CodexOfficeViewProvider", () => {
  beforeEach(() => vi.clearAllMocks());

  it("connects on ready and sends an authoritative sanitized empty snapshot", async () => {
    const provider = new FakeProvider();
    const harness = createView();
    const viewProvider = new CodexOfficeViewProvider({} as never, provider);
    viewProvider.resolveWebviewView(harness.view as never);

    harness.receive({ protocolVersion: 1, type: "ready" });
    await flush();

    expect(provider.connect).toHaveBeenCalledOnce();
    expect(provider.snapshot).toHaveBeenCalledOnce();
    expect(harness.posted).toContainEqual(
      expect.objectContaining({ type: "connection", state: "connected" }),
    );
    expect(harness.posted).toContainEqual(
      expect.objectContaining({
        type: "snapshot",
        snapshot: expect.objectContaining({
          agents: [],
          connection: "connected",
        }),
      }),
    );
    harness.dispose();
  });

  it("coalesces refresh work and disconnects when the view is disposed", async () => {
    const provider = new FakeProvider();
    const harness = createView();
    const viewProvider = new CodexOfficeViewProvider({} as never, provider);
    viewProvider.resolveWebviewView(harness.view as never);
    harness.receive({ protocolVersion: 1, type: "refresh" });
    harness.receive({ protocolVersion: 1, type: "refresh" });
    await flush();

    expect(provider.connect).toHaveBeenCalledOnce();
    expect(provider.refresh).toHaveBeenCalledOnce();
    expect(
      harness.posted.filter(
        (message) =>
          typeof message === "object" &&
          message !== null &&
          "type" in message &&
          message.type === "refresh-requested",
      ),
    ).toHaveLength(2);

    harness.dispose();
    expect(provider.disconnect).toHaveBeenCalledOnce();
  });

  it("starts a fresh connection when reopened during a pending connection", async () => {
    let resolveFirst: (() => void) | undefined;
    const provider = new FakeProvider();
    provider.connect = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValue(undefined);
    const viewProvider = new CodexOfficeViewProvider({} as never, provider);
    const first = createView();
    viewProvider.resolveWebviewView(first.view as never);
    first.receive({ protocolVersion: 1, type: "ready" });
    first.dispose();

    const second = createView();
    viewProvider.resolveWebviewView(second.view as never);
    second.receive({ protocolVersion: 1, type: "ready" });
    await flush();
    resolveFirst?.();
    await flush();

    expect(provider.connect).toHaveBeenCalledTimes(2);
    expect(second.posted).toContainEqual(
      expect.objectContaining({ type: "snapshot" }),
    );
    second.dispose();
  });

  it("polls only while the resolved view remains visible", async () => {
    vi.useFakeTimers();
    try {
      const provider = new FakeProvider();
      const harness = createView();
      const viewProvider = new CodexOfficeViewProvider({} as never, provider);
      viewProvider.resolveWebviewView(harness.view as never);
      harness.receive({ protocolVersion: 1, type: "ready" });
      await Promise.resolve();
      await Promise.resolve();

      await vi.advanceTimersByTimeAsync(2_000);
      expect(provider.refresh).toHaveBeenCalledOnce();

      harness.dispose();
      await vi.advanceTimersByTimeAsync(4_000);
      expect(provider.refresh).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it("projects bounded provider diagnostics without executable paths", async () => {
    const provider = new FakeProvider();
    provider.snapshot.mockResolvedValue({
      ...empty,
      connection: "degraded",
    });
    provider.diagnostic.mockReturnValue("executable-unavailable");
    const harness = createView();
    const viewProvider = new CodexOfficeViewProvider({} as never, provider);
    viewProvider.resolveWebviewView(harness.view as never);

    harness.receive({ protocolVersion: 1, type: "ready" });
    await flush();

    expect(harness.posted).toContainEqual(
      expect.objectContaining({
        type: "connection",
        state: "degraded",
        reason: "provider-executable-unavailable",
      }),
    );
    expect(JSON.stringify(harness.posted)).not.toContain("/Applications/");
    harness.dispose();
  });
});
