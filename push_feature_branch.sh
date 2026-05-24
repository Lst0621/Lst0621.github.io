#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/git_workflow_common.sh"

usage() {
  cat <<'EOF'
Usage:
  ./push_feature_branch.sh [site-branch] [tsl-branch] [remote]
  ./push_feature_branch.sh --site-only [site-branch] [remote]

Description:
  Push the rebased feature branch in lib/tsl to origin/main, record the new
  lib/tsl gitlink in the site repo if needed, then push the site feature tip to
  origin/master.
  Use --site-only to push only the site repo and leave lib/tsl unchanged.

Defaults:
  site branch = current checkout in site repo
  remote = origin
  tsl branch = same as site branch
EOF
}

SITE_ONLY=false
ARGS=()
for arg in "$@"; do
  if [[ "$arg" == "--site-only" ]]; then
    SITE_ONLY=true
  else
    ARGS+=("$arg")
  fi
done

if [[ "$SITE_ONLY" == true && ${#ARGS[@]} -gt 2 ]]; then
  usage
  exit 1
fi

if [[ "$SITE_ONLY" == false && ${#ARGS[@]} -gt 3 ]]; then
  usage
  exit 1
fi

if [[ ${#ARGS[@]} -ge 1 && -n "${ARGS[0]}" ]]; then
  SITE_FEATURE_BRANCH="${ARGS[0]}"
else
  SITE_FEATURE_BRANCH="$(git -C "$SCRIPT_DIR" rev-parse --abbrev-ref HEAD)"
  [[ "$SITE_FEATURE_BRANCH" != "HEAD" ]] || die "site repo is in detached HEAD; pass a feature branch explicitly"
fi

if [[ "$SITE_ONLY" == true ]]; then
  if [[ ${#ARGS[@]} -ge 2 && -n "${ARGS[1]}" ]]; then
    REMOTE_NAME="${ARGS[1]}"
  else
    REMOTE_NAME="origin"
  fi
else
  if [[ ${#ARGS[@]} -ge 2 && -n "${ARGS[1]}" ]]; then
    TSL_FEATURE_BRANCH="${ARGS[1]}"
  else
    TSL_FEATURE_BRANCH="$SITE_FEATURE_BRANCH"
  fi

  if [[ ${#ARGS[@]} -ge 3 && -n "${ARGS[2]}" ]]; then
    REMOTE_NAME="${ARGS[2]}"
  else
    REMOTE_NAME="origin"
  fi
fi

SITE_ROOT="${SCRIPT_DIR}"
TSL_ROOT="$(tsl_root_dir "$SITE_ROOT")"

[[ -d "$TSL_ROOT" ]] || die "missing submodule path: ${TSL_ROOT}"

ensure_clean_except_submodule "$SITE_ROOT" "site repo" "lib/tsl"

checkout_feature_branch "$SITE_ROOT" "$SITE_FEATURE_BRANCH" "$REMOTE_NAME" "${REMOTE_NAME}/master"

if [[ "$SITE_ONLY" == true ]]; then
  echo "==> Site-only push: skipping lib/tsl"
else
  ensure_clean "$TSL_ROOT" "lib/tsl"

  checkout_feature_branch "$TSL_ROOT" "$TSL_FEATURE_BRANCH" "$REMOTE_NAME" "${REMOTE_NAME}/main"

  echo "==> Pushing lib/tsl to ${REMOTE_NAME}/main"
  push_feature_to_base "$TSL_ROOT" "$REMOTE_NAME" "main"

  echo "==> Recording lib/tsl pointer in site repo"
  commit_submodule_pointer_if_needed "$SITE_ROOT" "$SITE_FEATURE_BRANCH"
fi

echo "==> Pushing site repo to ${REMOTE_NAME}/master"
push_feature_to_base "$SITE_ROOT" "$REMOTE_NAME" "master"

echo "Done."
