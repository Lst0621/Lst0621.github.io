#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./push_all_clean.sh [remote] [branch]
# Defaults:
#   remote = origin
#   branch = current branch in each repo/submodule

REMOTE="${1:-origin}"
BRANCH_ARG="${2:-}"

echo "==> Checking superproject is clean..."
if [[ -n "$(git status --porcelain)" ]]; then
  echo "ERROR: Superproject has uncommitted changes."
  git status --short
  exit 1
fi

echo "==> Checking all submodules are initialized..."
git submodule update --init --recursive

echo "==> Checking every submodule is clean (recursive)..."
git submodule foreach --recursive '
  if [ -n "$(git status --porcelain)" ]; then
    echo "ERROR: Dirty submodule: $name ($path)"
    git status --short
    exit 1
  fi
'

echo "==> Pushing submodules first (recursive)..."
git submodule foreach --recursive '
  branch="'${BRANCH_ARG}'"
  if [ -z "$branch" ]; then
    branch="$(git rev-parse --abbrev-ref HEAD)"
  fi

  if [ "$branch" = "HEAD" ]; then
    echo "ERROR: Detached HEAD in submodule: $name ($path)"
    exit 1
  fi

  echo "Pushing $name ($path) -> '"${REMOTE}"'/$branch"
  git push "'${REMOTE}'" "$branch"
'

echo "==> Pushing superproject..."
if [[ -n "$BRANCH_ARG" ]]; then
  git push "$REMOTE" "$BRANCH_ARG"
else
  current_branch="$(git rev-parse --abbrev-ref HEAD)"
  if [[ "$current_branch" == "HEAD" ]]; then
    echo "ERROR: Superproject is in detached HEAD."
    exit 1
  fi
  git push "$REMOTE" "$current_branch"
fi

echo "Done: all clean, submodules pushed, superproject pushed."

