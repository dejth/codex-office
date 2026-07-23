/* global console, process */

import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";

export const budgets = Object.freeze({
  extensionBytes: 100 * 1024,
  webviewBytes: 350 * 1024,
  stylesheetBytes: 20 * 1024,
  imageBytes: 600_000,
  distBytes: 1024 * 1024,
  vsixBytes: 700 * 1024,
});

const forbiddenPackagePaths = [
  /^extension\/(?:src|tests|tasks|docs|coverage|\.github)\//,
  /^extension\/assets\/office\/(?:animation|source|status)\//,
  /^extension\/assets\/office\/status-atlas\.png$/,
  /^extension\/tmp\//,
  /(?:^|\/)\.DS_Store$/,
  /\.map$/,
  /\.(?:ts|tsx)$/,
];

function fail(message) {
  throw new Error(message);
}

function parseArguments(argv) {
  const options = { dist: "dist", vsix: null, packageList: null };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    const next = argv[index + 1];
    if (value === "--dist" && next) options.dist = next;
    else if (value === "--vsix" && next) options.vsix = next;
    else if (value === "--package-list" && next) options.packageList = next;
    else fail(`Unknown or incomplete argument: ${value}`);
    if (value?.startsWith("--")) index += 1;
  }
  return options;
}

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? filesUnder(path) : [path];
    }),
  );
  return nested.flat();
}

async function measure(path) {
  return (await stat(path)).size;
}

function assertWithin(label, actual, maximum) {
  if (actual > maximum)
    fail(`${label} is ${actual} bytes; budget is ${maximum} bytes`);
}

function inspectPackageEntries(entries) {
  const normalized = entries
    .map((entry) => entry.trim().replaceAll("\\", "/"))
    .filter(Boolean);
  const forbidden = normalized.filter((entry) =>
    forbiddenPackagePaths.some((pattern) => pattern.test(entry)),
  );
  if (forbidden.length > 0)
    fail(`Forbidden packaged paths: ${forbidden.join(", ")}`);

  for (const required of [
    "extension/package.json",
    "extension/dist/extension.js",
    "extension/dist/webview.js",
    "extension/dist/webview.css",
  ])
    if (!normalized.includes(required))
      fail(`Required packaged path is missing: ${required}`);

  const runtimeImages = normalized.filter((entry) =>
    /^extension\/dist\/assets\/[a-z-]+-[A-Z0-9]+\.png$/.test(entry),
  );
  if (runtimeImages.length !== 9)
    fail(`Expected 9 packaged runtime images; found ${runtimeImages.length}`);

  return normalized.length;
}

function entriesFromVsix(vsix) {
  const result = spawnSync("unzip", ["-Z1", vsix], { encoding: "utf8" });
  if (result.status !== 0)
    fail(`Unable to inspect VSIX: ${result.stderr.trim() || "unzip failed"}`);
  return result.stdout.split(/\r?\n/u);
}

export async function checkBudgets(options) {
  const dist = resolve(options.dist);
  const files = await filesUnder(dist);
  const byName = new Map(files.map((path) => [basename(path), path]));
  const required = (name) => {
    const path = byName.get(name);
    if (!path) fail(`Missing dist artifact: ${name}`);
    return path;
  };

  const extensionBytes = await measure(required("extension.js"));
  const webviewBytes = await measure(required("webview.js"));
  const stylesheetBytes = await measure(required("webview.css"));
  const imageFiles = files.filter((path) => path.endsWith(".png"));
  if (imageFiles.length !== 9)
    fail(`Expected 9 emitted status images; found ${imageFiles.length}`);
  const imageBytes = (
    await Promise.all(imageFiles.map((path) => measure(path)))
  ).reduce((total, bytes) => total + bytes, 0);
  const distBytes = (
    await Promise.all(files.map((path) => measure(path)))
  ).reduce((total, bytes) => total + bytes, 0);

  assertWithin("extension.js", extensionBytes, budgets.extensionBytes);
  assertWithin("webview.js", webviewBytes, budgets.webviewBytes);
  assertWithin("webview.css", stylesheetBytes, budgets.stylesheetBytes);
  assertWithin("emitted status images", imageBytes, budgets.imageBytes);
  assertWithin("dist", distBytes, budgets.distBytes);

  let vsix = null;
  if (options.vsix) {
    const path = resolve(options.vsix);
    const bytes = await measure(path);
    assertWithin("VSIX", bytes, budgets.vsixBytes);
    const entries = inspectPackageEntries(entriesFromVsix(path));
    const sha256 = createHash("sha256")
      .update(await readFile(path))
      .digest("hex");
    vsix = { path, bytes, entries, sha256 };
  } else if (options.packageList) {
    const list = await readFile(resolve(options.packageList), "utf8");
    inspectPackageEntries(list.split(/\r?\n/u));
  }

  return {
    dist: relative(process.cwd(), dist).split(sep).join("/") || ".",
    extensionBytes,
    webviewBytes,
    stylesheetBytes,
    imageBytes,
    imageCount: imageFiles.length,
    distBytes,
    budgets,
    vsix,
  };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(import.meta.filename)
) {
  try {
    console.log(
      JSON.stringify(await checkBudgets(parseArguments(process.argv.slice(2)))),
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
