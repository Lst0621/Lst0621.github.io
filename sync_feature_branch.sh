#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/git_workflow_common.sh"

SUBMODULE_PATH="lib/tsl"

usage() {
  cat <<'EOF'
Usage:
  ./sync_feature_branch.sh [site-branch] [tsl-branch] [remote]

Description:
  Rebase lib/tsl onto origin/main, align the lib/tsl gitlink in the site
  repo, then rebase the site repo onto origin/master. Does not push; use
  ./push_feature_branch.sh when ready to publish.

Defaults:
  feature branch = current checkout in site repo
  tsl branch = same as site branch
  remote = origin
  site base branch = master
  tsl base branch = main
EOF
}

submodule_pointer_dirty() {
  [[ -n "$(git -C "$SITE_ROOT" status --porcelain -- "$SUBMODULE_PATH")" ]]
}

show_submodule_pointer_diff() {
  local recorded checked_out
  recorded="$(git -C "$SITE_ROOT" ls-tree HEAD "$SUBMODULE_PATH" | awk '{print $3}')"
  checked_out="$(git -C "$TSL_ROOT" rev-parse HEAD)"
  echo "==> Recorded in site tip: ${recorded:-<none>}"
  echo "==> Checked out in lib/tsl: ${checked_out}"
}

prompt_yes() {
  local prompt="$1"
  local answer
  read -r -p "${prompt} [y/N] " answer
  [[ "$answer" == "y" || "$answer" == "Y" ]]
}

maybe_amend_submodule_pointer() {
  local prompt="$1"

  if ! submodule_pointer_dirty; then
    echo "==> lib/tsl pointer already matches site tip; skipping."
    return 0
  fi

  ensure_clean_except_submodule "$SITE_ROOT" "site repo" "$SUBMODULE_PATH"
  show_submodule_pointer_diff

  if ! prompt_yes "$prompt"; then
    die "aborted; site rebase requires a clean tree with an aligned lib/tsl pointer"
  fi

  git -C "$SITE_ROOT" add "$SUBMODULE_PATH"
  git -C "$SITE_ROOT" commit --amend --no-edit
  echo "==> Amended site tip with lib/tsl pointer."
}

maybe_commit_submodule_pointer() {
  local prompt="$1"

  if ! submodule_pointer_dirty; then
    echo "==> lib/tsl pointer already matches site tip; nothing to fix."
    return 0
  fi

  ensure_clean_except_submodule "$SITE_ROOT" "site repo" "$SUBMODULE_PATH"
  show_submodule_pointer_diff

  if ! prompt_yes "$prompt"; then
    echo "==> Skipped lib/tsl pointer fix; run ./push_feature_branch.sh or commit manually."
    return 0
  fi

  commit_submodule_pointer_if_needed "$SITE_ROOT" "$SITE_FEATURE_BRANCH"
  echo "==> Recorded lib/tsl pointer in site repo."
}

SITE_BASE_BRANCH="master"
TSL_BASE_BRANCH="main"

SITE_ROOT="$SCRIPT_DIR"
TSL_ROOT="${SITE_ROOT}/${SUBMODULE_PATH}"

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

echo "==> Rebasing lib/tsl onto ${REMOTE_NAME}/${TSL_BASE_BRANCH}..."
git -C "$TSL_ROOT" rebase "${REMOTE_NAME}/${TSL_BASE_BRANCH}"

maybe_amend_submodule_pointer \
  "Amend site tip with lib/tsl pointer so site rebase can run?"

echo "==> Rebasing site repo onto ${REMOTE_NAME}/${SITE_BASE_BRANCH}..."
git -C "$SITE_ROOT" rebase "${REMOTE_NAME}/${SITE_BASE_BRANCH}"

maybe_commit_submodule_pointer \
  "Fix lib/tsl pointer at site tip?"

echo "Done. Use ./push_feature_branch.sh when ready to publish."
