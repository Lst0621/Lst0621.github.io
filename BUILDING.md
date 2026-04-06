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

Bundles all `lib/page/*.ts` and `lib/common/*.ts` entry points with esbuild.

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

Runs Jest and writes JSON results to `lib/tsl/test/results.json`.

For human-readable output only (no JSON file):

```bash
cd lib && npm run jest
```
