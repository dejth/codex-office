import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const temporary: string[] = [];

function createDist(root: string): string {
  const dist = join(root, "dist");
  mkdirSync(join(dist, "assets"), { recursive: true });
  for (const file of ["extension.js", "webview.js", "webview.css"])
    writeFileSync(join(dist, file), "x");
  for (let index = 0; index < 9; index += 1)
    writeFileSync(join(dist, "assets", `status-${index}.png`), "png");
  return dist;
}

afterEach(() => {
  for (const path of temporary.splice(0))
    rmSync(path, { recursive: true, force: true });
});

describe("VSIX content policy", () => {
  it("accepts the minimal runtime package surface", () => {
    const root = mkdtempSync(join(tmpdir(), "codex-office-package-test-"));
    temporary.push(root);
    const dist = createDist(root);
    const list = join(root, "package-list.txt");
    writeFileSync(
      list,
      [
        "extension/package.json",
        "extension/dist/extension.js",
        "extension/dist/webview.js",
        "extension/dist/webview.css",
        ...Array.from(
          { length: 9 },
          (_, index) =>
            `extension/dist/assets/status-${String.fromCharCode(97 + index)}-ABC123.png`,
        ),
        "extension/assets/activity-bar.svg",
        "extension/LICENSE",
        "extension/README.md",
      ].join("\n"),
    );
    expect(() =>
      execFileSync(process.execPath, [
        "scripts/check-budgets.mjs",
        "--dist",
        dist,
        "--package-list",
        list,
      ]),
    ).not.toThrow();
  });

  it("rejects a package with missing runtime images", () => {
    const root = mkdtempSync(join(tmpdir(), "codex-office-package-test-"));
    temporary.push(root);
    const dist = createDist(root);
    const list = join(root, "package-list.txt");
    writeFileSync(
      list,
      [
        "extension/package.json",
        "extension/dist/extension.js",
        "extension/dist/webview.js",
        "extension/dist/webview.css",
      ].join("\n"),
    );
    expect(() =>
      execFileSync(
        process.execPath,
        ["scripts/check-budgets.mjs", "--dist", dist, "--package-list", list],
        { stdio: "pipe" },
      ),
    ).toThrow(/Expected 9 packaged runtime images/u);
  });

  it("rejects source, raw art, and source maps", () => {
    const root = mkdtempSync(join(tmpdir(), "codex-office-package-test-"));
    temporary.push(root);
    const dist = createDist(root);
    const list = join(root, "package-list.txt");
    writeFileSync(
      list,
      [
        "extension/package.json",
        "extension/dist/extension.js",
        "extension/dist/webview.js",
        "extension/dist/webview.css",
        "extension/src/extension/extension.ts",
        "extension/assets/office/source/atlas.png",
        "extension/assets/office/animation/thinking.png",
        "extension/tmp/imagegen/atlas.png",
        "extension/dist/webview.js.map",
      ].join("\n"),
    );
    expect(() =>
      execFileSync(
        process.execPath,
        ["scripts/check-budgets.mjs", "--dist", dist, "--package-list", list],
        { stdio: "pipe" },
      ),
    ).toThrow(/Forbidden packaged paths/u);
  });
});
