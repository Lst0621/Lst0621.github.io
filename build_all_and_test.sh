#!/usr/bin/env bash
# Build everything (native gtest target, Emscripten WASM, JS bundle to /assets) and run all tests.
# Delegates to existing scripts: lib/tsl/wasm/test_build.sh, build_assets_local.sh, lib/package.json (npm).

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

run_step "Website assets (WASM + JS) — ./build_assets_local.sh" \
  bash -c "cd \"${REPO_ROOT}\" && ./build_assets_local.sh"

run_step "TypeScript tests (Jest) — cd lib && npm test" \
  bash -c "cd \"${LIB_DIR}\" && npm test"

echo ""
echo "================================================================================"
echo "  Done: gtest + assets (WASM+JS) + Jest all finished successfully."
echo "================================================================================"
echo ""
