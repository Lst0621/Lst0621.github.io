#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WASM_DIR="${REPO_ROOT}/lib/tsl/wasm"
WASM_BUILD_DIR="${WASM_DIR}/wasm_out_ci"
ASSETS_WASM_DIR="${REPO_ROOT}/assets/wasm"

echo "==> Build WASM (Emscripten) into: ${WASM_BUILD_DIR}"
"${WASM_DIR}/build.sh"

echo "==> Generate history CSV"
bash "${REPO_ROOT}/get_last_commit_time.sh"

echo "==> Copy WASM outputs to: ${ASSETS_WASM_DIR}"
mkdir -p "${ASSETS_WASM_DIR}"
cp -v "${WASM_BUILD_DIR}"/*.js "${ASSETS_WASM_DIR}/"
cp -v "${WASM_BUILD_DIR}"/*.wasm "${ASSETS_WASM_DIR}/"

echo "==> Build JS into: ${REPO_ROOT}/assets/js"
(cd "${REPO_ROOT}/lib" && npm run build)

echo "==> Done"
