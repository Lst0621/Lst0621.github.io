# Lst0621.github.io

## Prerequisites

- Node.js
- Emscripten (`emcc` / `em++`) for WASM builds
- CMake >= 3.15

## Install

```bash
cd lib && npm install
```

## Build TypeScript

```bash
cd lib && npm run build
```

Bundles all `lib/page/*.ts` and `lib/common/*.ts` entry points with esbuild and writes outputs to `assets/js/`.

## Build website assets (local verification)

Build outputs are **not committed**; they are produced into `assets/` and can be served locally for quick verification.

```bash
# Build WASM to a CI-style folder
cd lib/tsl/wasm
cmake -S . -B wasm_out_ci -DCMAKE_BUILD_TYPE=Release -DCMAKE_C_COMPILER=emcc -DCMAKE_CXX_COMPILER=em++
cmake --build wasm_out_ci -j

# Copy WASM to website assets
cd ../../../..
mkdir -p assets/wasm
cp -v lib/tsl/wasm/wasm_out_ci/*.js assets/wasm/
cp -v lib/tsl/wasm/wasm_out_ci/*.wasm assets/wasm/

# Build JS to website assets
cd lib && npm run build
```

Then serve the repo root with any static server and verify the site loads:

- `/assets/js/...`
- `/assets/wasm/wasm_*.js`
- `/assets/wasm/wasm_*.wasm`

## Build WASM

```bash
cd lib/tsl/wasm && ./build.sh
```

Compiles C++ sources to WebAssembly via Emscripten. Output goes to `lib/tsl/wasm/wasm_out_v1/`.

## Test

### C++ unit tests (Google Test)

```bash
cd lib/tsl/wasm && ./test_build.sh
```

Builds with the native C++ compiler and runs Google Test.

### TypeScript tests (Jest)

```bash
cd lib && npm test
```

Runs Jest and writes JSON results to `assets/test/results.json`.

For human-readable output only (no JSON file):

```bash
cd lib && npm run jest
```
