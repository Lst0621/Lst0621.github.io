/**
 * Build all entry points (lib/page/*.ts and lib/common/*.ts) with esbuild.
 * Run from repo root: node lib/build.js
 * Or from lib/: node build.js
 */
import * as esbuild from "esbuild";
import { readdirSync, existsSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const libRoot = __dirname;
const pageDir = join(libRoot, "page");
const commonDir = join(libRoot, "common");

const wasmExternalPlugin = {
  name: "wasm-external",
  setup(build) {
    build.onResolve({ filter: /wasm_out_v1\/wasm_[^/]+$/ }, (args) => {
      const name = args.path.split("/").pop();
      return {
        path: `../tsl/wasm/wasm_out_v1/${name}.js`,
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

for (const entry of entries) {
  const outfile = entry.replace(/\.ts$/, ".js");
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

// Remove copied WASM from lib/page/ if present (loader stays external under tsl/wasm/).
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
