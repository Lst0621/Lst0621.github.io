#!/usr/bin/env bash
set -euo pipefail

N="${1:-10}"

echo "== top-level ($(pwd)) =="
git log -"${N}" --oneline

if git submodule status --recursive >/dev/null 2>&1; then
  git submodule foreach --recursive '
    echo
    echo "== $name ($path) =="
    git log -'"${N}"' --oneline
  '
fi

