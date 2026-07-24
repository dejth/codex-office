import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

interface LaunchConfiguration {
  version: string;
  configurations: Array<{
    name: string;
    type: string;
    request: string;
    args: string[];
    outFiles: string[];
    sourceMaps: boolean;
  }>;
}

describe("VS Code Extension Host launch configuration", () => {
  it("runs the current extension build in this workspace", () => {
    const launch = JSON.parse(
      readFileSync(resolve(".vscode/launch.json"), "utf8"),
    ) as LaunchConfiguration;

    expect(launch.version).toBe("0.2.0");
    expect(launch.configurations).toEqual([
      {
        name: "Run Codex Office Extension",
        type: "extensionHost",
        request: "launch",
        args: [
          "--disable-extensions",
          "--extensionDevelopmentPath=${workspaceFolder}",
          "--folder-uri=file://${workspaceFolder}",
        ],
        outFiles: ["${workspaceFolder}/dist/**/*.js"],
        sourceMaps: true,
      },
    ]);
    expect(launch.configurations[0]?.args).toHaveLength(3);
    expect(launch.configurations[0]?.args.at(-1)).toBe(
      "--folder-uri=file://${workspaceFolder}",
    );
  });
});
