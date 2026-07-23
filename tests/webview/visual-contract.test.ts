import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const css = readFileSync(
  new URL("../../src/webview/styles.css", import.meta.url),
  "utf8",
);

describe("Office and Meter visual contract", () => {
  it("keeps focus, theme, high-contrast, narrow, and reduced-motion gates", () => {
    expect(css).toContain(":focus-visible");
    expect(css).toContain("--vscode-foreground");
    expect(css).toContain("--vscode-contrastBorder");
    expect(css).toMatch(/@media\s+\(max-width:\s*360px\)/);
    expect(css).toMatch(/@media\s+\(prefers-reduced-motion:\s*reduce\)/);
    expect(css).toContain('.office-room[data-reduced-motion="true"]');
  });

  it("loads only local production images", () => {
    const urls = [...css.matchAll(/url\(([^)]+)\)/g)].map((match) =>
      match[1]?.replaceAll('"', ""),
    );
    expect(urls).toHaveLength(9);
    expect(
      urls.every((url) => url?.startsWith("../../assets/office/status/")),
    ).toBe(true);
    expect(css).not.toMatch(/https?:\/\//);
  });
});
