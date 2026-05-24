#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/git_workflow_common.sh"

usage() {
  cat <<'EOF'
Usage:
  ./cut_feature_branch.sh <site-branch> [tsl-branch] [remote]
  ./cut_feature_branch.sh <site-branch> --site-only [remote]

Description:
  Create or switch both repos to the requested feature branch from
  origin/master and origin/main.
  Use --site-only to cut only the site branch and leave lib/tsl unchanged.

Defaults:
  remote = origin
  tsl branch = same as site branch
EOF
}

if [[ $# -lt 1 || $# -gt 3 ]]; then
  usage
  exit 1
fi

SITE_FEATURE_BRANCH="$1"
SITE_ONLY=false

if [[ $# -ge 2 && "$2" == "--site-only" ]]; then
  SITE_ONLY=true
  REMOTE_NAME="${3:-origin}"
elif [[ $# -ge 2 && -n "$2" ]]; then
  TSL_FEATURE_BRANCH="$2"
  REMOTE_NAME="${3:-origin}"
else
  TSL_FEATURE_BRANCH="$SITE_FEATURE_BRANCH"
  REMOTE_NAME="${3:-origin}"
fi
SITE_ROOT="${SCRIPT_DIR}"
TSL_ROOT="$(tsl_root_dir "$SITE_ROOT")"

[[ -d "$TSL_ROOT" ]] || die "missing submodule path: ${TSL_ROOT}"

ensure_clean "$SITE_ROOT" "site repo"

if [[ "$SITE_ONLY" == false ]]; then
  ensure_clean "$TSL_ROOT" "lib/tsl"
fi

echo "==> Checking out feature branch in site repo"
checkout_feature_branch "$SITE_ROOT" "$SITE_FEATURE_BRANCH" "$REMOTE_NAME" "${REMOTE_NAME}/master"

if [[ "$SITE_ONLY" == false ]]; then
  echo "==> Checking out feature branch in lib/tsl"
  checkout_feature_branch "$TSL_ROOT" "$TSL_FEATURE_BRANCH" "$REMOTE_NAME" "${REMOTE_NAME}/main"
else
  echo "==> Skipping lib/tsl (site-only cut)"
fi

echo "Done."
