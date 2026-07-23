import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("clean-profile smoke script", () => {
  it("plans an isolated lifecycle without touching the real profile", () => {
    const output = execFileSync(
      process.execPath,
      [
        "scripts/smoke-clean-profile.mjs",
        "--vsix",
        "/tmp/candidate.vsix",
        "--dry-run",
      ],
      { encoding: "utf8" },
    );
    const report = JSON.parse(output) as {
      isolated: boolean;
      temporaryRoot: string | null;
      commands: Array<{ phase: string; command: string[] }>;
    };
    expect(report.isolated).toBe(true);
    expect(report.temporaryRoot).toBeNull();
    expect(report.commands.map(({ phase }) => phase)).toEqual([
      "install",
      "disable-process-check",
      "uninstall",
    ]);
    for (const { command } of report.commands) {
      expect(command).toContain("--user-data-dir");
      expect(command).toContain("--extensions-dir");
      expect(command.join(" ")).not.toContain(
        `${process.env.HOME}/Library/Application Support/Code`,
      );
    }
  });

  it("includes a distinct baseline upgrade phase when supplied", () => {
    const output = execFileSync(
      process.execPath,
      [
        "scripts/smoke-clean-profile.mjs",
        "--vsix",
        "/tmp/candidate.vsix",
        "--baseline-vsix",
        "/tmp/baseline.vsix",
        "--dry-run",
      ],
      { encoding: "utf8" },
    );
    const report = JSON.parse(output) as {
      upgrade: { exercised: boolean };
      commands: Array<{ phase: string }>;
    };
    expect(report.upgrade.exercised).toBe(true);
    expect(report.commands.map(({ phase }) => phase)).toEqual([
      "install-baseline",
      "upgrade",
      "disable-process-check",
      "uninstall",
    ]);
  });
});
