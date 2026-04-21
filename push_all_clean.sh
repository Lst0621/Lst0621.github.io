#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./push_all_clean.sh [remote] [branch]
# Defaults:
#   remote = origin
#   branch = current branch in each repo/submodule
#
# Pushes submodules deepest-first, then the superproject, so that when
# a parent repo is pushed the commit referenced by its gitlink already
# exists on the child's remote.

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

echo "==> Collecting submodule paths (pre-order)..."
# $displaypath is the path from the superproject root, which is what we need
# to `cd` into from here. `foreach --recursive` walks top-down; we reverse it
# below to get deepest-first.
mapfile -t SUBMODULE_PATHS < <(
  git submodule foreach --recursive --quiet 'echo "$displaypath"'
)

if [[ ${#SUBMODULE_PATHS[@]} -eq 0 ]]; then
  echo "(no submodules)"
else
  echo "==> Pushing submodules deepest-first..."
  SUPER_ROOT="$(pwd)"
  # Iterate in reverse: reversing a pre-order walk yields a valid
  # "children before parents" order.
  for (( i=${#SUBMODULE_PATHS[@]}-1; i>=0; i-- )); do
    sub="${SUBMODULE_PATHS[$i]}"
    (
      cd "$SUPER_ROOT/$sub"

      branch="$BRANCH_ARG"
      if [[ -z "$branch" ]]; then
        branch="$(git rev-parse --abbrev-ref HEAD)"
      fi

      if [[ "$branch" == "HEAD" ]]; then
        echo "ERROR: Detached HEAD in submodule: $sub"
        exit 1
      fi

      echo "Pushing submodule $sub -> $REMOTE/$branch"
      git push "$REMOTE" "$branch"
    )
  done
fi

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

echo "Done: all clean, submodules pushed deepest-first, superproject pushed."
