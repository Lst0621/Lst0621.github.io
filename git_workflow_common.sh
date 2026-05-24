#!/usr/bin/env bash
set -euo pipefail

die() {
  echo "ERROR: $*" >&2
  exit 1
}

site_root_dir() {
  cd "$(dirname "${BASH_SOURCE[0]}")" && pwd
}

tsl_root_dir() {
  echo "${1}/lib/tsl"
}

ensure_clean() {
  local repo_path="$1"
  local label="$2"

  if [[ -n "$(git -C "$repo_path" status --porcelain)" ]]; then
    echo "ERROR: ${label} has uncommitted changes." >&2
    git -C "$repo_path" status --short >&2
    exit 1
  fi
}

ensure_clean_except_submodule() {
  local repo_path="$1"
  local label="$2"
  local submodule_path="$3"

  local filtered_dirty
  filtered_dirty="$(
    git -C "$repo_path" status --porcelain |
      while IFS= read -r line; do
        case "$line" in
          *" ${submodule_path}")
            ;;
          *)
            printf '%s\n' "$line"
            ;;
        esac
      done
  )"

  if [[ -n "$filtered_dirty" ]]; then
    echo "ERROR: ${label} has uncommitted changes other than ${submodule_path}." >&2
    printf '%s\n' "$filtered_dirty" >&2
    exit 1
  fi
}

fetch_base_branch() {
  local repo_path="$1"
  local remote_name="$2"
  local base_branch="$3"

  git -C "$repo_path" fetch "$remote_name" "$base_branch"
}

checkout_feature_branch() {
  local repo_path="$1"
  local branch_name="$2"
  local remote_name="$3"
  local base_ref="$4"

  if git -C "$repo_path" show-ref --verify --quiet "refs/heads/${branch_name}"; then
    git -C "$repo_path" checkout "$branch_name"
    return
  fi

  if git -C "$repo_path" show-ref --verify --quiet "refs/remotes/${remote_name}/${branch_name}"; then
    git -C "$repo_path" checkout -b "$branch_name" --track "${remote_name}/${branch_name}"
    return
  fi

  git -C "$repo_path" checkout -b "$branch_name" "$base_ref"
}

push_feature_to_base() {
  local repo_path="$1"
  local remote_name="$2"
  local base_branch="$3"

  local current_branch
  current_branch="$(git -C "$repo_path" rev-parse --abbrev-ref HEAD)"
  [[ "$current_branch" != "HEAD" ]] || die "detached HEAD in ${repo_path}"

  git -C "$repo_path" push "$remote_name" "HEAD:${base_branch}"
}

commit_submodule_pointer_if_needed() {
  local site_root="$1"
  local feature_branch="$2"

  if [[ -n "$(git -C "$site_root" status --porcelain -- lib/tsl)" ]]; then
    git -C "$site_root" add lib/tsl
    git -C "$site_root" commit -m "Sync lib/tsl to ${feature_branch}"
  fi
}
