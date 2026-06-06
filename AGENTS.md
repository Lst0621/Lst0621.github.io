---
alwaysApply: true
description: Build, test, and workflow instructions for this site repo
---

# AGENTS.md
## Requirements

- Do not commit unless explicitly asked. Commit permission is single-use: one explicit request permits only the specific commit(s) needed for that request, and does not grant commit permission for the rest of the session.
- `lib/tsl` is a submodule, so if a submodule change must be recorded, commit it in `lib/tsl` first.
- For changes inside `lib/tsl`, also follow `lib/tsl/AGENTS.md`.
- On site branches (including `master` and feature branches), a `lib/tsl` bump should be committed together with its related site changes in one commit.
- Do not mention code agent(s) in commit messages.
- For debugging, check `.ts` source files by default unless explicitly asked to inspect `.js` or compilation output.
- Prefer repository scripts/helpers we created over manual direct command sequences when they are equivalent (for example `./build_assets_local.sh` and branch helper scripts instead of hand-running multi-step `npm` flows).
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
