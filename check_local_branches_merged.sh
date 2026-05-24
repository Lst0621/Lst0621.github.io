#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  ./check_local_branches_merged.sh [--repo <path>]

Description:
  Show every local branch in the target repo and whether it is merged into the
  repo's primary base branch.

Base branch selection:
  master if present, otherwise main, otherwise the current branch's upstream,
  otherwise HEAD.
EOF
}

repo_path="."

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)
      [[ $# -ge 2 ]] || { usage; exit 1; }
      repo_path="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      usage
      exit 1
      ;;
  esac
done

repo_abs="$(cd "$repo_path" && pwd)"

if git -C "$repo_abs" show-ref --verify --quiet refs/heads/master; then
  base_ref="master"
elif git -C "$repo_abs" show-ref --verify --quiet refs/heads/main; then
  base_ref="main"
else
  current_branch="$(git -C "$repo_abs" rev-parse --abbrev-ref HEAD)"
  if [[ "$current_branch" != "HEAD" ]] && git -C "$repo_abs" rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then
    base_ref="$(git -C "$repo_abs" rev-parse --abbrev-ref --symbolic-full-name '@{u}')"
  else
    base_ref="HEAD"
  fi
fi

echo "Repo: ${repo_abs}"
echo "Base: ${base_ref}"
echo ""
printf '%-10s %s\n' STATUS BRANCH

while IFS= read -r branch_name; do
  if git -C "$repo_abs" merge-base --is-ancestor "$branch_name" "$base_ref"; then
    status="merged"
  else
    status="unmerged"
  fi

  current_marker=""
  if [[ "$branch_name" == "$(git -C "$repo_abs" rev-parse --abbrev-ref HEAD)" ]]; then
    current_marker=" *"
  fi

  printf '%-10s %s%s\n' "$status" "$branch_name" "$current_marker"
done < <(git -C "$repo_abs" for-each-ref --format='%(refname:short)' refs/heads | sort)