/* global console, process */

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

function fail(message) {
  throw new Error(message);
}

function parseArguments(argv) {
  const options = {
    vsix: null,
    baselineVsix: null,
    code: "code",
    extensionId: "dejth.codex-office",
    dryRun: false,
    keep: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    const next = argv[index + 1];
    if (value === "--vsix" && next) options.vsix = resolve(next);
    else if (value === "--baseline-vsix" && next)
      options.baselineVsix = resolve(next);
    else if (value === "--code" && next) options.code = next;
    else if (value === "--extension-id" && next) options.extensionId = next;
    else if (value === "--dry-run") options.dryRun = true;
    else if (value === "--keep") options.keep = true;
    else fail(`Unknown or incomplete argument: ${value}`);
    if (
      ["--vsix", "--baseline-vsix", "--code", "--extension-id"].includes(value)
    )
      index += 1;
  }
  if (!options.vsix) fail("--vsix is required");
  return options;
}

function versionFromVsix(vsix) {
  const result = spawnSync("unzip", ["-p", vsix, "extension/package.json"], {
    encoding: "utf8",
  });
  if (result.status !== 0) fail(`Unable to read package.json from ${vsix}`);
  const value = JSON.parse(result.stdout);
  if (typeof value.version !== "string") fail(`VSIX has no valid version`);
  return value.version;
}

function compareVersions(left, right) {
  const parse = (value) => value.split("-")[0].split(".").map(Number);
  const a = parse(left);
  const b = parse(right);
  for (let index = 0; index < 3; index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) return Math.sign(difference);
  }
  return 0;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const root = await mkdtemp(join(tmpdir(), "codex-office-smoke-"));
  const userData = join(root, "user-data");
  const extensions = join(root, "extensions");
  const commands = [];
  const base = ["--user-data-dir", userData, "--extensions-dir", extensions];
  const candidateVersion = options.dryRun
    ? "<candidate-version>"
    : versionFromVsix(options.vsix);

  const run = (phase, args) => {
    const command = [options.code, ...base, ...args];
    commands.push({ phase, command });
    if (options.dryRun) return "";
    const result = spawnSync(command[0], command.slice(1), {
      encoding: "utf8",
      timeout: 60_000,
    });
    if (result.status !== 0)
      fail(
        `${phase} failed: ${result.stderr.trim() || result.stdout.trim() || `exit ${result.status}`}`,
      );
    return result.stdout;
  };
  const list = () =>
    run("list", ["--list-extensions", "--show-versions"])
      .split(/\r?\n/u)
      .map((line) => line.trim().toLowerCase())
      .filter(Boolean);
  const expected = `${options.extensionId}@${candidateVersion}`.toLowerCase();

  try {
    let upgrade = { exercised: false, reason: "no baseline VSIX supplied" };
    if (options.baselineVsix) {
      if (!options.dryRun) {
        const baselineVersion = versionFromVsix(options.baselineVsix);
        if (compareVersions(baselineVersion, candidateVersion) >= 0)
          fail(
            `Baseline ${baselineVersion} must be older than candidate ${candidateVersion}`,
          );
      }
      run("install-baseline", [
        "--install-extension",
        options.baselineVsix,
        "--force",
      ]);
      run("upgrade", ["--install-extension", options.vsix, "--force"]);
      upgrade = { exercised: true, reason: null };
    } else {
      run("install", ["--install-extension", options.vsix, "--force"]);
    }

    if (!options.dryRun && !list().includes(expected))
      fail(`Installed extension/version not found: ${expected}`);

    run("disable-process-check", [
      "--disable-extension",
      options.extensionId,
      "--list-extensions",
      "--show-versions",
    ]);
    run("uninstall", ["--uninstall-extension", options.extensionId]);
    if (
      !options.dryRun &&
      list().some((entry) =>
        entry.startsWith(`${options.extensionId.toLowerCase()}@`),
      )
    )
      fail(`Extension remains installed after uninstall`);

    console.log(
      JSON.stringify({
        ok: true,
        isolated: true,
        candidateVersion,
        upgrade,
        temporaryRoot: options.keep ? root : null,
        commands,
      }),
    );
  } finally {
    if (!options.keep) await rm(root, { recursive: true, force: true });
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
