#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WASM_DIR="${REPO_ROOT}/lib/tsl/wasm"
WASM_BUILD_DIR="${WASM_DIR}/wasm_out_ci"
ASSETS_WASM_DIR="${REPO_ROOT}/assets/wasm"

echo "==> Build WASM (Emscripten) into: ${WASM_BUILD_DIR}"
mkdir -p "${WASM_BUILD_DIR}"
cmake -S "${WASM_DIR}" -B "${WASM_BUILD_DIR}" \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_C_COMPILER=emcc \
  -DCMAKE_CXX_COMPILER=em++
cmake --build "${WASM_BUILD_DIR}" -j

echo "==> Copy WASM outputs to: ${ASSETS_WASM_DIR}"
mkdir -p "${ASSETS_WASM_DIR}"
cp -v "${WASM_BUILD_DIR}"/*.js "${ASSETS_WASM_DIR}/"
cp -v "${WASM_BUILD_DIR}"/*.wasm "${ASSETS_WASM_DIR}/"

echo "==> Build JS into: ${REPO_ROOT}/assets/js"
(cd "${REPO_ROOT}/lib" && npm run build)

echo "==> Done"
