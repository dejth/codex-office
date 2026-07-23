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
    expect(css).toContain(
      '.office-empty-state[data-reduced-motion="true"] .pixel-character',
    );
  });

  it("loads only local production images", () => {
    const urls = [...css.matchAll(/url\(([^)]+)\)/g)].map((match) =>
      match[1]?.replaceAll('"', ""),
    );
    expect(urls).toHaveLength(9);
    expect(
      urls.every((url) => url?.startsWith("../../assets/office/animation/")),
    ).toBe(true);
    expect(css).not.toMatch(/https?:\/\//);
  });

  it("uses five-frame sprite motion rather than whole-image transforms", () => {
    expect(css).toContain("@keyframes office-sprite-five");
    expect(css).toContain("background-size: 500% 100%");
    expect(css).toContain("background-position: 50% center");
    expect(css).toContain("background-position: 100% center");
    expect(css).not.toContain("@keyframes office-breathe");
    expect(css).not.toContain("@keyframes office-type");
    expect(css).toContain(
      '.office-empty-state[data-reduced-motion="false"] .pixel-character',
    );
    expect(css).toContain("width: min(100%, 192px)");
    expect(css).toContain("width: min(92%, 192px)");
  });
});
