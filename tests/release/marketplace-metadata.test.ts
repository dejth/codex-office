import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface ExtensionManifest {
  description?: string;
  icon?: string;
  name?: string;
  publisher?: string;
  version?: string;
}

const manifest = JSON.parse(
  readFileSync("package.json", "utf8"),
) as ExtensionManifest;
const readme = readFileSync("README.md", "utf8");
const preview = readFileSync("scripts/marketplace-preview.html", "utf8");
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

describe("Marketplace metadata", () => {
  it("identifies the reviewed beta candidate and PNG listing icon", () => {
    expect(manifest.name).toBe("codex-office");
    expect(manifest.publisher).toBe("dejth");
    expect(manifest.version).toBe("0.1.2");
    expect(manifest.icon).toMatch(/\.png$/u);
    expect(readFileSync(manifest.icon!).subarray(0, 8)).toEqual(pngSignature);
    expect(
      readFileSync("assets/marketplace/agent-room.png").subarray(0, 8),
    ).toEqual(pngSignature);
  });

  it("describes supported status without claiming per-agent token usage", () => {
    expect(manifest.description).toContain("privacy-safe status");
    expect(manifest.description).not.toMatch(/token usage|billing/iu);
    expect(readme).toContain(
      "Per-agent token usage is intentionally unavailable",
    );
    expect(readme).not.toContain("Understand where the tokens go");
    expect(readme).toContain("## Compatibility");
    expect(readme).toContain("## Troubleshooting");
    expect(readme).toContain("strict, bounded validation");
  });

  it("keeps the deterministic preview directly openable from its file path", () => {
    expect(preview).toContain('href="../dist/webview.css"');
    expect(preview).toContain('src="../dist/webview.js"');
    expect(preview).not.toMatch(/(?:href|src)="\/dist\//u);
  });
});
