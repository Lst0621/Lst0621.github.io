#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/git_workflow_common.sh"

usage() {
  cat <<'EOF'
Usage:
  ./fetch_bases.sh [remote]

Description:
  Fetch the latest master for the site repo and main for lib/tsl.

Defaults:
  remote = origin
EOF
}

if [[ $# -gt 1 ]]; then
  usage
  exit 1
fi

REMOTE_NAME="${1:-origin}"
SITE_ROOT="${SCRIPT_DIR}"
TSL_ROOT="$(tsl_root_dir "$SITE_ROOT")"

[[ -d "$TSL_ROOT" ]] || die "missing submodule path: ${TSL_ROOT}"

echo "==> Fetching ${REMOTE_NAME}/master in site repo"
fetch_base_branch "$SITE_ROOT" "$REMOTE_NAME" "master"

echo "==> Fetching ${REMOTE_NAME}/main in lib/tsl"
fetch_base_branch "$TSL_ROOT" "$REMOTE_NAME" "main"

echo "Done."
