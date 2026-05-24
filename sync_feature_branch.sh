#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/git_workflow_common.sh"

usage() {
  cat <<'EOF'
Usage:
  ./sync_feature_branch.sh [site-branch] [tsl-branch] [remote]

Description:
  Rebase the site repo and lib/tsl submodule directly onto origin/master and
  origin/main, record the updated lib/tsl gitlink in the site repo, then push
  the updated feature tips back to the matching remote branches.

Defaults:
  feature branch = current checkout in site repo
  tsl branch = same as site branch
  remote = origin
  site base branch = master
  tsl base branch = main
EOF
}

SITE_BASE_BRANCH="master"
TSL_BASE_BRANCH="main"

SITE_ROOT="$SCRIPT_DIR"
TSL_ROOT="${SITE_ROOT}/lib/tsl"

[[ -d "$TSL_ROOT" ]] || die "missing submodule path: ${TSL_ROOT}"

if [[ $# -gt 3 ]]; then
  usage
  exit 1
fi

if [[ $# -ge 1 && -n "$1" ]]; then
  SITE_FEATURE_BRANCH="$1"
else
  SITE_FEATURE_BRANCH="$(git -C "$SITE_ROOT" rev-parse --abbrev-ref HEAD)"
  [[ "$SITE_FEATURE_BRANCH" != "HEAD" ]] || die "site repo is in detached HEAD; pass a feature branch explicitly"
fi

if [[ $# -ge 2 && -n "$2" ]]; then
  TSL_FEATURE_BRANCH="$2"
else
  TSL_FEATURE_BRANCH="$SITE_FEATURE_BRANCH"
fi

REMOTE_NAME="${3:-origin}"

echo "==> Site root: ${SITE_ROOT}"
echo "==> TSL root: ${TSL_ROOT}"
echo "==> Site feature branch: ${SITE_FEATURE_BRANCH}"
echo "==> TSL feature branch: ${TSL_FEATURE_BRANCH}"
echo "==> Remote: ${REMOTE_NAME}"

ensure_clean "$SITE_ROOT" "site repo"
ensure_clean "$TSL_ROOT" "lib/tsl"

echo "==> Checking out feature branch in site repo..."
checkout_feature_branch "$SITE_ROOT" "$SITE_FEATURE_BRANCH" "$REMOTE_NAME" "$REMOTE_NAME/$SITE_BASE_BRANCH"

echo "==> Checking out feature branch in lib/tsl..."
checkout_feature_branch "$TSL_ROOT" "$TSL_FEATURE_BRANCH" "$REMOTE_NAME" "$REMOTE_NAME/$TSL_BASE_BRANCH"

echo "==> Rebasing site repo onto ${REMOTE_NAME}/${SITE_BASE_BRANCH}..."
git -C "$SITE_ROOT" rebase "${REMOTE_NAME}/${SITE_BASE_BRANCH}"

echo "==> Rebasing lib/tsl onto ${REMOTE_NAME}/${TSL_BASE_BRANCH}..."
git -C "$TSL_ROOT" rebase "${REMOTE_NAME}/${TSL_BASE_BRANCH}"

echo "==> Pushing lib/tsl to ${REMOTE_NAME}/${TSL_BASE_BRANCH}..."
"${SCRIPT_DIR}/push_feature_branch.sh" "$SITE_FEATURE_BRANCH" "$TSL_FEATURE_BRANCH" "$REMOTE_NAME"

echo "Done."