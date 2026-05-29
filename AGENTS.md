---
alwaysApply: true
description: Build, test, and workflow instructions for this site repo
---

# AGENTS.md
## Requirements

- Do not commit unless explicitly asked.
- `lib/tsl` is a submodule, so if a submodule change must be recorded, commit it in `lib/tsl` first.
- On site branches (including `master` and feature branches), a `lib/tsl` bump should be committed together with its related site changes in one commit.
- Do not mention code agent(s) in commit messages.
- For debugging, check `.ts` source files by default unless explicitly asked to inspect `.js` or compilation output.
- When running C++ tests, do not run heavy/long tests unless explicitly asked.
- Prefer repository scripts/helpers we created over manual direct command sequences when they are equivalent (for example `./build.sh`, `./build_assets_local.sh`, and branch helper scripts instead of hand-running multi-step `cmake`/`npm` flows).
- Exception: for targeted/partial test runs (not full test suites), prefer direct command-line test invocations so only the needed tests run.
- If expected tools are missing in a non-interactive shell (for example `node`, `npm`, `nvm`, or other user-installed tools), source your shell rc first and retry (for example `source ~/.bashrc`; if needed, `source ~/.nvm/nvm.sh`).

## Canonical Commands

### Install

```bash
cd lib && npm install
```

### TypeScript build

Use this as the default:

```bash
cd lib && npm run build
```

- Entry points: `lib/page/*.ts` and `lib/common/*.ts`
- Output location: `assets/js/page/*.js` and `assets/js/common/*.js`
- Preferred default is the `lib/package.json` script (`npm run build` from `lib`)
- Do not run `node lib/build.js` from the repo root; that can emit different path comments in `.js` files
- `lib/build.js` emits JS directly into `assets/js` via esbuild `outfile` (no JS copy step)

Single non-entry TS file (standalone compile when needed):

```bash
cd lib && npx tsc test/test_math.ts --esModuleInterop --target es2019 --module esnext --skipLibCheck --strict
```

### WASM build

Use the script:

```bash
cd lib/tsl/wasm && ./build.sh
```

- Build dir: `lib/tsl/wasm/wasm_out_ci`
- Toolchain: Emscripten (`emcc`/`em++`)
- Do not create/use `lib/tsl/wasm/build` for this workflow

### Native C++ tests (Google Test)

```bash
cd lib/tsl/core && ./test_build.sh
```

- Build dir: `lib/tsl/core/native_build`
- Uses system native C++ compiler (not Emscripten)
- Avoid heavy/long-running suites unless explicitly requested

### Full local asset verification

```bash
./build_assets_local.sh
```

This builds WASM into `wasm_out_ci`, copies WASM outputs to `assets/wasm`, and builds JS into `assets/js`.
There is no JS copy step in this script because the JS build already writes directly to `assets/js`.

### JavaScript/TypeScript tests

```bash
cd lib && npm test
```

Readable console-only Jest output:

```bash
cd lib && npm run jest
```

## C++ Change Checklist

When changing files in `lib/tsl/core/src/`, `lib/tsl/core/gtest/`, or `lib/tsl/wasm/src/`:

1. Run native tests:

```bash
cd lib/tsl/core && ./test_build.sh
```

2. Run WASM build:

```bash
cd lib/tsl/wasm && ./build.sh
```

If C/C++ exports changed:

1. Update `lib/tsl/wasm/ts/wasm_out_ci.d.ts` and relevant `wasm_api_*.ts`
2. Rebuild TS: `cd lib && npm run build`
3. Run local asset build: `./build_assets_local.sh`

## clangd + WASM Notes

- After `./build.sh`, `lib/tsl/wasm/.clangd` is generated for IDE config
- Use a new enough `clangd` for current Emscripten libc++ (old clangd can show false `std` errors)
- Configure `clangd` query driver to include your `em++` path

## Feature Branch Helpers

Repository helper scripts:

```bash
./cut_feature_branch.sh [site-branch] [tsl-branch] [remote]
./cut_feature_branch.sh <site-branch> --site-only [remote]
./sync_feature_branch.sh [site-branch] [tsl-branch] [remote]
./push_feature_branch.sh [site-branch] [tsl-branch] [remote]
./push_feature_branch.sh --site-only [site-branch] [remote]
./fetch_bases.sh [remote]
./check_local_branches_merged.sh [--repo <path>]
```

Use `--site-only` when you do not want branch changes in `lib/tsl`.
