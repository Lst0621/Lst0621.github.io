#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  ./create_worktree_feature.sh <feature-name> [options]

Description:
  Create a sibling worktree for <feature-name>, initialize submodules recursively,
  and (by default) create/checkout the same feature branch in all submodules.

Options:
  --base <branch>                   Top-level base branch (default: master)
  --submodule-base <branch>         Submodule base branch (default: main)
  --parent <dir>                    Parent directory for new worktree (default: ..)
  --remote <name>                   Remote name to resolve remote branches (default: origin)
  --skip-submodule-branches         Only create top-level worktree branch
  -h, --help                        Show this help

Examples:
  ./create_worktree_feature.sh feature/rational-bigint
  ./create_worktree_feature.sh feature/rational-bigint --base master
  ./create_worktree_feature.sh feature/rational-bigint --submodule-base main
  ./create_worktree_feature.sh feature/rational-bigint --skip-submodule-branches
EOF
}

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

FEATURE_NAME=""
TOP_BASE_BRANCH="master"
SUBMODULE_BASE_BRANCH="main"
PARENT_DIR=".."
REMOTE_NAME="origin"
CUT_SUBMODULE_BRANCHES=1

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      usage
      exit 0
      ;;
    --base)
      if [[ $# -lt 2 ]]; then
        echo "ERROR: --base requires a value"
        exit 1
      fi
      TOP_BASE_BRANCH="$2"
      shift 2
      ;;
    --submodule-base)
      if [[ $# -lt 2 ]]; then
        echo "ERROR: --submodule-base requires a value"
        exit 1
      fi
      SUBMODULE_BASE_BRANCH="$2"
      shift 2
      ;;
    --parent)
      if [[ $# -lt 2 ]]; then
        echo "ERROR: --parent requires a value"
        exit 1
      fi
      PARENT_DIR="$2"
      shift 2
      ;;
    --remote)
      if [[ $# -lt 2 ]]; then
        echo "ERROR: --remote requires a value"
        exit 1
      fi
      REMOTE_NAME="$2"
      shift 2
      ;;
    --skip-submodule-branches)
      CUT_SUBMODULE_BRANCHES=0
      shift
      ;;
    -*)
      echo "ERROR: Unknown option: $1"
      usage
      exit 1
      ;;
    *)
      if [[ -z "${FEATURE_NAME}" ]]; then
        FEATURE_NAME="$1"
      else
        echo "ERROR: Unexpected argument: $1"
        usage
        exit 1
      fi
      shift
      ;;
  esac
done

if [[ -z "${FEATURE_NAME}" ]]; then
  echo "ERROR: feature-name is required"
  usage
  exit 1
fi

if [[ "${FEATURE_NAME}" =~ [[:space:]] ]]; then
  echo "ERROR: feature-name cannot contain spaces: ${FEATURE_NAME}"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

REPO_NAME="$(basename "${SCRIPT_DIR}")"
FEATURE_SLUG="${FEATURE_NAME//\//-}"
PARENT_ABS="$(cd "${PARENT_DIR}" && pwd)"
WORKTREE_DIR="${PARENT_ABS}/${REPO_NAME}-${FEATURE_SLUG}"

if [[ -e "${WORKTREE_DIR}" ]]; then
  echo "ERROR: Target worktree path already exists: ${WORKTREE_DIR}"
  exit 1
fi

resolve_start_ref() {
  local branch="$1"
  local remote="$2"
  if git show-ref --verify --quiet "refs/heads/${branch}"; then
    echo "${branch}"
    return 0
  fi
  if git show-ref --verify --quiet "refs/remotes/${remote}/${branch}"; then
    echo "${remote}/${branch}"
    return 0
  fi
  echo ""
}

echo "==> Repository: ${SCRIPT_DIR}"
echo "==> Feature: ${FEATURE_NAME}"
echo "==> Top-level base branch: ${TOP_BASE_BRANCH}"
echo "==> Submodule base branch: ${SUBMODULE_BASE_BRANCH}"
echo "==> Remote: ${REMOTE_NAME}"
echo "==> New worktree path: ${WORKTREE_DIR}"

if git show-ref --verify --quiet "refs/heads/${FEATURE_NAME}"; then
  echo "==> Top-level branch exists locally, adding worktree on ${FEATURE_NAME}"
  git worktree add "${WORKTREE_DIR}" "${FEATURE_NAME}"
elif git show-ref --verify --quiet "refs/remotes/${REMOTE_NAME}/${FEATURE_NAME}"; then
  echo "==> Top-level branch exists on ${REMOTE_NAME}, creating local tracking branch"
  git worktree add --track -b "${FEATURE_NAME}" "${WORKTREE_DIR}" "${REMOTE_NAME}/${FEATURE_NAME}"
else
  TOP_BASE_REF="$(resolve_start_ref "${TOP_BASE_BRANCH}" "${REMOTE_NAME}")"
  if [[ -z "${TOP_BASE_REF}" ]]; then
    echo "ERROR: Cannot resolve base branch '${TOP_BASE_BRANCH}' locally or on '${REMOTE_NAME}'."
    exit 1
  fi
  echo "==> Creating top-level branch ${FEATURE_NAME} from ${TOP_BASE_REF}"
  git worktree add -b "${FEATURE_NAME}" "${WORKTREE_DIR}" "${TOP_BASE_REF}"
fi

cd "${WORKTREE_DIR}"
echo "==> Sync + init submodules (recursive)"
git submodule sync --recursive
git submodule update --init --recursive

if [[ "${CUT_SUBMODULE_BRANCHES}" -eq 1 ]]; then
  echo "==> Creating/checking out '${FEATURE_NAME}' in submodules (recursive)"
  git submodule foreach --recursive '
    set -eu
    feature="'"${FEATURE_NAME}"'"
    base="'"${SUBMODULE_BASE_BRANCH}"'"
    remote="'"${REMOTE_NAME}"'"

    echo "-- $name ($path)"

    if git show-ref --verify --quiet "refs/heads/${feature}"; then
      git checkout "${feature}"
      exit 0
    fi

    if git show-ref --verify --quiet "refs/remotes/${remote}/${feature}"; then
      git checkout -b "${feature}" --track "${remote}/${feature}"
      exit 0
    fi

    start_ref=""
    if git show-ref --verify --quiet "refs/heads/${base}"; then
      start_ref="${base}"
    elif git show-ref --verify --quiet "refs/remotes/${remote}/${base}"; then
      start_ref="${remote}/${base}"
    fi

    if [ -n "${start_ref}" ]; then
      git checkout -b "${feature}" "${start_ref}"
    else
      echo "WARN: base branch ${base} not found in $name; creating ${feature} from current commit"
      git checkout -b "${feature}"
    fi
  '
fi

echo ""
echo "Done."
echo "Worktree: ${WORKTREE_DIR}"
echo "Current branch: $(git rev-parse --abbrev-ref HEAD)"
echo ""
echo "Tip: run 'git submodule status --recursive' in ${WORKTREE_DIR} to verify pointers."
