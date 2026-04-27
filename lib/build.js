/**
 * Build all entry points (lib/page/*.ts and lib/common/*.ts) with esbuild.
 * Run from repo root: node lib/build.js
 * Or from lib/: node build.js
 */
import * as esbuild from "esbuild";
import { readdirSync, existsSync, unlinkSync, mkdirSync } from "fs";
import { join, dirname, relative } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const libRoot = __dirname;
const pageDir = join(libRoot, "page");
const commonDir = join(libRoot, "common");
const repoRoot = join(libRoot, "..");
const assetsJsDir = join(repoRoot, "assets", "js");

const wasmExternalPlugin = {
  name: "wasm-external",
  setup(build) {
    build.onResolve({ filter: /wasm_out_v1\/wasm_[^/]+$/ }, (args) => {
      const name = args.path.split("/").pop();
      return {
        path: `/assets/wasm/${name}.js`,
        external: true,
      };
    });
  },
};

function getEntries(dir) {
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => join(dir, f));
}

const pageEntries = getEntries(pageDir);
const commonEntries = getEntries(commonDir);
const entries = [...pageEntries, ...commonEntries];

const options = {
  bundle: true,
  format: "esm",
  target: "es2022",
  sourcemap: false,
  plugins: [wasmExternalPlugin],
};

mkdirSync(assetsJsDir, { recursive: true });

for (const entry of entries) {
  const relFromLib = relative(libRoot, entry).replace(/\.ts$/, ".js");
  const outfile = join(assetsJsDir, relFromLib);
  try {
    await esbuild.build({
      ...options,
      entryPoints: [entry],
      outfile,
    });
    console.log(`${entry} -> ${outfile}`);
  } catch (err) {
    console.error(`Failed ${entry}:`, err);
    process.exit(1);
  }
}

// Remove copied WASM from lib/page/ if present (loader stays external under /assets/wasm/).
for (const f of readdirSync(pageDir)) {
  if (f.endsWith(".wasm")) {
    const p = join(pageDir, f);
    if (existsSync(p)) {
      unlinkSync(p);
      console.log(`Removed lib/page/${f} (WASM loader is external).`);
    }
  }
}

console.log(`Built ${entries.length} entries.`);
