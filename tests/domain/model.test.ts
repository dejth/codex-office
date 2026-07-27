import { describe, expect, it } from "vitest";
import type { AgentNode } from "../../src/domain/model";

describe("AgentNode contract", () => {
  it("represents nested subagents without provider data", () => {
    const child: AgentNode = {
      id: "child-1",
      parentId: "main-1",
      name: "Explorer",
      task: null,
      status: "reading",
      lastActivityAt: null,
      usage: null,
      children: [],
    };
    expect(child.parentId).toBe("main-1");
    expect(child.children).toEqual([]);
  });
});
