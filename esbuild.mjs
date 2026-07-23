import * as esbuild from "esbuild";
import { rm } from "node:fs/promises";

const watch = process.argv.includes("--watch");
await rm("dist", { force: true, recursive: true });
const builds = [
  {
    entryPoints: ["src/extension/extension.ts"],
    outfile: "dist/extension.js",
    bundle: true,
    platform: "node",
    format: "cjs",
    external: ["vscode"],
    minify: true,
  },
  {
    entryPoints: ["src/webview/main.tsx"],
    outfile: "dist/webview.js",
    bundle: true,
    platform: "browser",
    format: "iife",
    minify: true,
    loader: { ".png": "file" },
    assetNames: "assets/[name]-[hash]",
    define: { "process.env.NODE_ENV": '"production"' },
  },
];

if (watch) {
  const contexts = await Promise.all(
    builds.map((options) => esbuild.context(options)),
  );
  await Promise.all(contexts.map((context) => context.watch()));
  console.log("Watching Codex Office…");
} else {
  await Promise.all(builds.map((options) => esbuild.build(options)));
}
