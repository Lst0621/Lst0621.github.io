#!/usr/bin/env bash
# Build everything (native gtest target, Emscripten WASM, TypeScript bundle) and run all tests.
# Delegates to existing scripts: lib/tsl/wasm/test_build.sh, lib/tsl/wasm/build.sh, lib/package.json (npm).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WASM_DIR="${REPO_ROOT}/lib/tsl/wasm"
LIB_DIR="${REPO_ROOT}/lib"

run_step() {
  local title="$1"
  shift
  echo ""
  echo "================================================================================"
  echo "  ${title}"
  echo "================================================================================"
  "$@"
}

run_step "C++ Google Test (configure, build, run) — lib/tsl/wasm/test_build.sh" \
  bash -c "cd \"${WASM_DIR}\" && ./test_build.sh"

run_step "WASM (Emscripten) — lib/tsl/wasm/build.sh" \
  bash -c "cd \"${WASM_DIR}\" && ./build.sh"

run_step "TypeScript bundle — cd lib && npm run build" \
  bash -c "cd \"${LIB_DIR}\" && npm run build"

run_step "TypeScript tests (Jest) — cd lib && npm test" \
  bash -c "cd \"${LIB_DIR}\" && npm test"

echo ""
echo "================================================================================"
echo "  Done: gtest + WASM + TS build + Jest all finished successfully."
echo "================================================================================"
echo ""
