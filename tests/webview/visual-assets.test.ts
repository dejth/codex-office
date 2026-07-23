import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

interface AssetEntry {
  file: string;
  bytes: number;
  sha256: string;
}

interface AssetManifest {
  grid: { width: number; height: number };
  animationGrid: {
    frameWidth: number;
    frameHeight: number;
    frames: number;
    blinkFrame: number;
  };
  budgetBytes: { perAsset: number; total: number };
  assets: Record<string, AssetEntry>;
  animations: Record<string, AssetEntry>;
}

const officeRoot = resolve(process.cwd(), "assets/office");
const manifest = JSON.parse(
  readFileSync(resolve(officeRoot, "manifest.json"), "utf8"),
) as AssetManifest;
const statuses = [
  "thinking",
  "reading",
  "editing",
  "running-command",
  "waiting-approval",
  "completed",
  "failed",
  "idle",
  "unknown",
];

function readPngDimensions(buffer: Buffer): {
  width: number;
  height: number;
  colorType: number;
} {
  expect(buffer.subarray(0, 8)).toEqual(
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  );
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    colorType: buffer.readUInt8(25),
  };
}

describe("Office production visual assets", () => {
  it("provides one deterministic local RGBA PNG for every status", () => {
    expect(Object.keys(manifest.assets)).toEqual(statuses);
    expect(readdirSync(resolve(officeRoot, "status")).sort()).toEqual(
      Object.values(manifest.assets)
        .map(({ file }) => file.replace("status/", ""))
        .sort(),
    );

    for (const status of statuses) {
      const entry = manifest.assets[status]!;
      expect(entry.file).toMatch(/^status\/[a-z-]+\.png$/);
      const path = resolve(officeRoot, entry.file);
      const contents = readFileSync(path);
      const dimensions = readPngDimensions(contents);

      expect(dimensions).toEqual({
        width: manifest.grid.width,
        height: manifest.grid.height,
        colorType: 6,
      });
      expect(statSync(path).size).toBe(entry.bytes);
      expect(createHash("sha256").update(contents).digest("hex")).toBe(
        entry.sha256,
      );
      expect(entry.bytes).toBeLessThanOrEqual(manifest.budgetBytes.perAsset);
    }
  });

  it("keeps the complete production set within its asset budget", () => {
    const total = [
      ...Object.values(manifest.assets),
      ...Object.values(manifest.animations),
    ].reduce((sum, asset) => sum + asset.bytes, 0);

    expect(total).toBeLessThanOrEqual(manifest.budgetBytes.total);
  });

  it("provides a deterministic five-frame RGBA sprite for every status", () => {
    expect(manifest.animationGrid).toMatchObject({
      frames: 5,
      blinkFrame: 3,
    });
    expect(Object.keys(manifest.animations)).toEqual(statuses);
    expect(readdirSync(resolve(officeRoot, "animation")).sort()).toEqual(
      Object.values(manifest.animations)
        .map(({ file }) => file.replace("animation/", ""))
        .sort(),
    );

    for (const status of statuses) {
      const entry = manifest.animations[status]!;
      const contents = readFileSync(resolve(officeRoot, entry.file));
      expect(readPngDimensions(contents)).toEqual({
        width:
          manifest.animationGrid.frameWidth * manifest.animationGrid.frames,
        height: manifest.animationGrid.frameHeight,
        colorType: 6,
      });
      expect(statSync(resolve(officeRoot, entry.file)).size).toBe(entry.bytes);
      expect(createHash("sha256").update(contents).digest("hex")).toBe(
        entry.sha256,
      );
      expect(entry.bytes).toBeLessThanOrEqual(manifest.budgetBytes.perAsset);
    }
  });

  it("uses a monochrome mascot head for the Activity Bar", () => {
    const icon = readFileSync(
      resolve(process.cwd(), "assets/activity-bar.svg"),
      "utf8",
    );

    expect(icon).toContain('viewBox="0 0 24 24"');
    expect(icon).toContain("currentColor");
    expect(icon).toContain("<circle");
    expect(icon.match(/<path /gu)).toHaveLength(5);
    expect(icon).not.toMatch(/#[0-9A-Fa-f]{3,8}/u);
    expect(icon).not.toContain("M4 20V8L12 3L20 8V20H4Z");
  });
});
