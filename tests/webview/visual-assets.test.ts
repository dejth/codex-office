import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { inflateSync } from "node:zlib";

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
    registration: string;
    sourceChroma: string;
    eyeColor: string;
    motionModel: string;
  };
  budgetBytes: { perAsset: number; total: number };
  anchor: {
    eyeCenterX: number;
    standingBaselineY: number;
    furnitureBaselineY: number;
    largeArtStatuses: string[];
  };
  motionBounds: Record<string, [number, number, number, number][]>;
  eyeBounds: Record<string, [number, number, number, number]>;
  invariantRegions: Record<string, [number, number, number, number][]>;
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

function readRgbaPixels(buffer: Buffer): {
  width: number;
  height: number;
  pixels: Uint8Array;
} {
  const { width, height, colorType } = readPngDimensions(buffer);
  expect(colorType).toBe(6);
  expect(buffer.readUInt8(24)).toBe(8);

  const chunks: Buffer[] = [];
  for (let offset = 8; offset < buffer.length;) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    if (type === "IDAT") {
      chunks.push(buffer.subarray(offset + 8, offset + 8 + length));
    }
    offset += length + 12;
  }

  const packed = inflateSync(Buffer.concat(chunks));
  const stride = width * 4;
  const pixels = new Uint8Array(stride * height);

  for (let y = 0; y < height; y += 1) {
    const filter = packed[y * (stride + 1)]!;
    expect(filter).toBeLessThanOrEqual(4);
    for (let x = 0; x < stride; x += 1) {
      const raw = packed[y * (stride + 1) + x + 1]!;
      const left = x >= 4 ? pixels[y * stride + x - 4]! : 0;
      const up = y > 0 ? pixels[(y - 1) * stride + x]! : 0;
      const upperLeft = y > 0 && x >= 4 ? pixels[(y - 1) * stride + x - 4]! : 0;
      let predictor = 0;

      if (filter === 1) predictor = left;
      if (filter === 2) predictor = up;
      if (filter === 3) predictor = Math.floor((left + up) / 2);
      if (filter === 4) {
        const estimate = left + up - upperLeft;
        const leftDistance = Math.abs(estimate - left);
        const upDistance = Math.abs(estimate - up);
        const upperLeftDistance = Math.abs(estimate - upperLeft);
        predictor =
          leftDistance <= upDistance && leftDistance <= upperLeftDistance
            ? left
            : upDistance <= upperLeftDistance
              ? up
              : upperLeft;
      }

      pixels[y * stride + x] = (raw + predictor) & 0xff;
    }
  }

  return { width, height, pixels };
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
      registration: "shared-crop-eye-x-foot-baseline",
      sourceChroma: "#00ff00",
      eyeColor: "#ff4fa3",
      motionModel: "generated-status-actions",
    });
    expect(Object.keys(manifest.animations)).toEqual(statuses);
    expect(readdirSync(resolve(officeRoot, "animation")).sort()).toEqual(
      Object.values(manifest.animations)
        .map(({ file }) => file.replace("animation/", ""))
        .sort(),
    );

    if (manifest.animationGrid.motionModel === "generated-status-actions") {
      for (const status of statuses) {
        const entry = manifest.animations[status]!;
        const contents = readFileSync(resolve(officeRoot, entry.file));
        expect(readPngDimensions(contents)).toEqual({
          width:
            manifest.animationGrid.frameWidth * manifest.animationGrid.frames,
          height: manifest.animationGrid.frameHeight,
          colorType: 6,
        });
        expect(statSync(resolve(officeRoot, entry.file)).size).toBe(
          entry.bytes,
        );
        expect(createHash("sha256").update(contents).digest("hex")).toBe(
          entry.sha256,
        );
        expect(entry.bytes).toBeLessThanOrEqual(manifest.budgetBytes.perAsset);

        const image = readRgbaPixels(contents);
        const eyeCenters: Array<[number, number]> = [];
        const baselines: number[] = [];
        const pinkCounts: number[] = [];
        const bodyWidths: number[] = [];
        for (let frame = 0; frame < manifest.animationGrid.frames; frame += 1) {
          let minX = manifest.animationGrid.frameWidth;
          let maxX = -1;
          let minY = manifest.animationGrid.frameHeight;
          let maxY = -1;
          let pinkX = 0;
          let pinkY = 0;
          let pinkCount = 0;
          let greenFringe = 0;
          let bodyMinX = manifest.animationGrid.frameWidth;
          let bodyMaxX = -1;
          let bubbleTealMinX = manifest.animationGrid.frameWidth;
          let bubbleTealMaxX = -1;
          let bubbleTealMinY = manifest.animationGrid.frameHeight;
          let bubbleTealMaxY = -1;
          let bubbleTealCount = 0;
          let ellipsisX = 0;
          let ellipsisY = 0;
          let ellipsisCount = 0;

          for (let y = 0; y < manifest.animationGrid.frameHeight; y += 1) {
            for (let x = 0; x < manifest.animationGrid.frameWidth; x += 1) {
              const imageX = frame * manifest.animationGrid.frameWidth + x;
              const pixel = (y * image.width + imageX) * 4;
              const red = image.pixels[pixel]!;
              const green = image.pixels[pixel + 1]!;
              const blue = image.pixels[pixel + 2]!;
              const alpha = image.pixels[pixel + 3]!;
              if (alpha === 0) continue;
              minX = Math.min(minX, x);
              maxX = Math.max(maxX, x);
              minY = Math.min(minY, y);
              maxY = Math.max(maxY, y);
              if (x < 88) {
                bodyMinX = Math.min(bodyMinX, x);
                bodyMaxX = Math.max(bodyMaxX, x);
              }
              if (
                red >= 150 &&
                blue >= 70 &&
                red - green >= 55 &&
                blue - green >= 35
              ) {
                pinkX += x;
                pinkY += y;
                pinkCount += 1;
              }
              if (green > 190 && green > red * 1.5 && green > blue * 1.5) {
                greenFringe += 1;
              }
              if (status === "thinking" && x >= 80 && y < 48) {
                if (
                  green > 50 &&
                  blue > 50 &&
                  red < 100 &&
                  Math.abs(green - blue) < 70
                ) {
                  bubbleTealMinX = Math.min(bubbleTealMinX, x);
                  bubbleTealMaxX = Math.max(bubbleTealMaxX, x);
                  bubbleTealMinY = Math.min(bubbleTealMinY, y);
                  bubbleTealMaxY = Math.max(bubbleTealMaxY, y);
                  bubbleTealCount += 1;
                }
                if (red === 255 && green === 243 && blue === 214) {
                  ellipsisX += x;
                  ellipsisY += y;
                  ellipsisCount += 1;
                }
              }
            }
          }

          const message = `${status} frame ${frame + 1}`;
          expect(minX, `${message} left padding`).toBeGreaterThan(0);
          expect(maxX, `${message} right padding`).toBeLessThan(
            manifest.animationGrid.frameWidth - 1,
          );
          expect(minY, `${message} top padding`).toBeGreaterThan(0);
          expect(maxY, `${message} bottom padding`).toBeLessThan(
            manifest.animationGrid.frameHeight - 1,
          );
          expect(maxY - minY + 1, `${message} visible scale`).toBeGreaterThan(
            80,
          );
          expect(pinkCount, `${message} visible pink eyes`).toBeGreaterThan(2);
          expect(greenFringe, `${message} chroma fringe`).toBe(0);
          const expectedBaseline =
            status === "editing" || status === "idle"
              ? manifest.anchor.furnitureBaselineY
              : manifest.anchor.standingBaselineY;
          expect(maxY, `${message} canonical baseline`).toBe(expectedBaseline);
          if (status === "thinking") {
            expect(
              bubbleTealCount,
              `${message} thinking bubble`,
            ).toBeGreaterThan(0);
            expect(ellipsisCount, `${message} centered ellipsis`).toBe(27);
            expect(
              Math.abs(
                ellipsisX / ellipsisCount -
                  (bubbleTealMinX + bubbleTealMaxX) / 2,
              ),
              `${message} ellipsis horizontal center`,
            ).toBeLessThanOrEqual(3);
            expect(
              Math.abs(
                ellipsisY / ellipsisCount -
                  (bubbleTealMinY + bubbleTealMaxY) / 2,
              ),
              `${message} ellipsis vertical center`,
            ).toBeLessThanOrEqual(3);
          }
          eyeCenters.push([pinkX / pinkCount, pinkY / pinkCount]);
          baselines.push(maxY);
          pinkCounts.push(pinkCount);
          bodyWidths.push(bodyMaxX - bodyMinX + 1);
        }

        expect(
          Math.max(...eyeCenters.map(([x]) => x)) -
            Math.min(...eyeCenters.map(([x]) => x)),
          `${status} eye anchor must not jitter horizontally`,
        ).toBeLessThanOrEqual(2);
        expect(
          Math.max(...eyeCenters.map(([, y]) => y)) -
            Math.min(...eyeCenters.map(([, y]) => y)),
          `${status} eye anchor must not jitter vertically`,
        ).toBeLessThanOrEqual(2);
        expect(
          Math.max(...baselines) - Math.min(...baselines),
          `${status} baseline must remain stable`,
        ).toBeLessThanOrEqual(2);
        expect(
          pinkCounts[manifest.animationGrid.blinkFrame - 1],
          `${status} frame three must be a visible blink`,
        ).toBeLessThan(Math.min(pinkCounts[0]!, pinkCounts[4]!));
        if (manifest.anchor.largeArtStatuses.includes(status)) {
          expect(
            Math.min(...bodyWidths),
            `${status} must retain the canonical visible body width`,
          ).toBeGreaterThanOrEqual(54);
        }
        if (status === "thinking") {
          let changesOutsideBubble = 0;
          for (let y = 0; y < manifest.animationGrid.frameHeight; y += 1) {
            for (let x = 0; x < manifest.animationGrid.frameWidth; x += 1) {
              if (x >= 80 && y < 48) continue;
              const first = (y * image.width + x) * 4;
              const second =
                (y * image.width + manifest.animationGrid.frameWidth + x) * 4;
              for (let channel = 0; channel < 4; channel += 1) {
                if (
                  image.pixels[first + channel] !==
                  image.pixels[second + channel]
                ) {
                  changesOutsideBubble += 1;
                  break;
                }
              }
            }
          }
          expect(
            changesOutsideBubble,
            "thinking frame two must not add an overlapping arm",
          ).toBe(0);
        }
      }
      return;
    }

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

      const image = readRgbaPixels(contents);
      let actionPixelChanges = 0;
      let invariantPixelChanges = 0;
      let protectedPixelChanges = 0;
      const opaquePixelCounts: number[] = [];
      const upperRightOpaquePixelCounts: number[] = [];
      for (let frame = 0; frame < manifest.animationGrid.frames; frame += 1) {
        let minX = manifest.animationGrid.frameWidth;
        let maxX = -1;
        let minY = manifest.animationGrid.frameHeight;
        let maxY = -1;
        let opaquePixels = 0;
        let upperRightOpaquePixels = 0;

        for (let y = 0; y < manifest.animationGrid.frameHeight; y += 1) {
          for (let x = 0; x < manifest.animationGrid.frameWidth; x += 1) {
            const imageX = frame * manifest.animationGrid.frameWidth + x;
            const alpha = image.pixels[(y * image.width + imageX) * 4 + 3]!;
            if (alpha === 0) continue;
            opaquePixels += 1;
            if (x >= 48 && y < 36) {
              upperRightOpaquePixels += 1;
            }
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
          }
        }
        opaquePixelCounts.push(opaquePixels);
        upperRightOpaquePixelCounts.push(upperRightOpaquePixels);

        if (frame > 0) {
          for (let y = 0; y < manifest.animationGrid.frameHeight; y += 1) {
            for (let x = 0; x < manifest.animationGrid.frameWidth; x += 1) {
              const [eyeLeft, eyeTop, eyeWidth, eyeHeight] =
                manifest.eyeBounds[status]!;
              const insideEyeBand =
                x >= eyeLeft &&
                x < eyeLeft + eyeWidth &&
                y >= eyeTop &&
                y < eyeTop + eyeHeight;
              const insideMotionRegion = manifest.motionBounds[status]!.some(
                ([left, top, width, height]) =>
                  x >= left && x < left + width && y >= top && y < top + height,
              );
              const insideInvariantRegion = manifest.invariantRegions[
                status
              ]!.some(
                ([left, top, width, height]) =>
                  x >= left && x < left + width && y >= top && y < top + height,
              );
              const reference = (y * image.width + x) * 4;
              const candidate =
                (y * image.width +
                  frame * manifest.animationGrid.frameWidth +
                  x) *
                4;
              const pixelChanged =
                image.pixels[candidate] !== image.pixels[reference] ||
                image.pixels[candidate + 1] !== image.pixels[reference + 1] ||
                image.pixels[candidate + 2] !== image.pixels[reference + 2] ||
                image.pixels[candidate + 3] !== image.pixels[reference + 3];
              if (insideMotionRegion && !insideEyeBand && pixelChanged) {
                actionPixelChanges += 1;
              }
              if (!insideEyeBand && !insideMotionRegion) {
                if (pixelChanged) {
                  invariantPixelChanges += 1;
                }
              }
              if (!insideEyeBand && insideInvariantRegion && pixelChanged) {
                protectedPixelChanges += 1;
              }
            }
          }
        }

        const message = `${status} frame ${frame + 1} must be complete and padded`;
        expect(minX, message).toBeGreaterThan(0);
        expect(maxX, message).toBeLessThan(
          manifest.animationGrid.frameWidth - 1,
        );
        expect(minY, message).toBeGreaterThan(0);
        expect(maxY, message).toBeLessThan(
          manifest.animationGrid.frameHeight - 1,
        );
        expect(maxY - minY + 1, message).toBeGreaterThanOrEqual(36);

        if (frame !== manifest.animationGrid.blinkFrame - 1) {
          let pinkPixels = 0;
          const [eyeLeft, eyeTop, eyeWidth, eyeHeight] =
            manifest.eyeBounds[status]!;
          for (let y = eyeTop; y < eyeTop + eyeHeight; y += 1) {
            for (let x = eyeLeft; x < eyeLeft + eyeWidth; x += 1) {
              const imageX = frame * manifest.animationGrid.frameWidth + x;
              const pixel = (y * image.width + imageX) * 4;
              const red = image.pixels[pixel]!;
              const green = image.pixels[pixel + 1]!;
              const blue = image.pixels[pixel + 2]!;
              const alpha = image.pixels[pixel + 3]!;
              if (
                alpha > 0 &&
                red >= 160 &&
                blue >= 80 &&
                red - green >= 60 &&
                blue - green >= 40
              ) {
                pinkPixels += 1;
              }
            }
          }
          expect(
            pinkPixels,
            `${status} frame ${frame + 1} must preserve visible pink eyes`,
          ).toBeGreaterThan(1);
        }
      }
      expect(
        actionPixelChanges,
        `${status} must animate an arm or prop in addition to blinking`,
      ).toBeGreaterThan(0);
      expect(
        invariantPixelChanges,
        `${status} must keep every pixel outside eye and motion layers identical`,
      ).toBe(0);
      expect(
        protectedPixelChanges,
        `${status} must keep protected head, body, and feet pixels identical`,
      ).toBe(0);
      if (status === "editing") {
        expect(
          Math.max(...opaquePixelCounts) - Math.min(...opaquePixelCounts),
          "editing frames must not introduce a duplicate robot silhouette",
        ).toBeLessThanOrEqual(50);
      }
      if (status === "unknown") {
        expect(
          Math.max(...upperRightOpaquePixelCounts),
          "unknown bubble must not introduce an opaque rectangular backdrop",
        ).toBeLessThanOrEqual(300);
      }
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
