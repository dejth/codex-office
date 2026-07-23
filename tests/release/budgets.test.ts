import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const temporary: string[] = [];

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "codex-office-budget-test-"));
  temporary.push(root);
  const dist = join(root, "dist");
  mkdirSync(join(dist, "assets"), { recursive: true });
  writeFileSync(join(dist, "extension.js"), "x");
  writeFileSync(join(dist, "webview.js"), "x");
  writeFileSync(join(dist, "webview.css"), "x");
  for (let index = 0; index < 9; index += 1)
    writeFileSync(join(dist, "assets", `status-${index}.png`), "png");
  return { root, dist };
}

afterEach(() => {
  for (const path of temporary.splice(0))
    rmSync(path, { recursive: true, force: true });
});

describe("release budgets", () => {
  it("accepts a complete dist tree within ratcheted budgets", () => {
    const { dist } = fixture();
    const output = execFileSync(
      process.execPath,
      ["scripts/check-budgets.mjs", "--dist", dist],
      { encoding: "utf8" },
    );
    expect(JSON.parse(output)).toMatchObject({ imageCount: 9, imageBytes: 27 });
  });

  it("rejects an oversized webview bundle", () => {
    const { dist } = fixture();
    writeFileSync(join(dist, "webview.js"), Buffer.alloc(350 * 1024 + 1));
    expect(() =>
      execFileSync(
        process.execPath,
        ["scripts/check-budgets.mjs", "--dist", dist],
        { encoding: "utf8", stdio: "pipe" },
      ),
    ).toThrow(/webview\.js is 358401 bytes/u);
  });
});
