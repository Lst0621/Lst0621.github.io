#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/git_workflow_common.sh"

usage() {
  cat <<'EOF'
Usage:
  ./auto_commit_tsl_bump.sh [--dry-run] [-m message]

Description:
  Commit the lib/tsl submodule pointer only when it is the sole change in the
  site repo. Refuses to commit if lib/tsl itself has uncommitted changes.

Defaults:
  message = Bump lib/tsl
EOF
}

DRY_RUN=false
COMMIT_MESSAGE="Bump lib/tsl"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run|-n)
      DRY_RUN=true
      shift
      ;;
    -m|--message)
      [[ $# -ge 2 ]] || die "missing commit message after $1"
      COMMIT_MESSAGE="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "unknown argument: $1"
      ;;
  esac
done

SITE_ROOT="$SCRIPT_DIR"
TSL_ROOT="$(tsl_root_dir "$SITE_ROOT")"

[[ -d "$TSL_ROOT" ]] || die "missing submodule path: ${TSL_ROOT}"

status="$(git -C "$SITE_ROOT" status --porcelain=v1 --untracked-files=all)"
if [[ -z "$status" ]]; then
  echo "No changes to commit."
  exit 0
fi

other_changes="$(
  while IFS= read -r line; do
    case "$line" in
      *" lib/tsl")
        ;;
      *)
        printf '%s\n' "$line"
        ;;
    esac
  done <<< "$status"
)"

if [[ -n "$other_changes" ]]; then
  echo "ERROR: refusing to commit because changes other than lib/tsl exist." >&2
  printf '%s\n' "$other_changes" >&2
  exit 1
fi

if git -C "$SITE_ROOT" diff --quiet -- lib/tsl &&
  git -C "$SITE_ROOT" diff --cached --quiet -- lib/tsl; then
  echo "No lib/tsl pointer bump to commit."
  exit 0
fi

ensure_clean "$TSL_ROOT" "lib/tsl"

old_tsl_commit="$(git -C "$SITE_ROOT" rev-parse HEAD:lib/tsl)"
new_tsl_commit="$(git -C "$TSL_ROOT" rev-parse HEAD)"

echo "lib/tsl: ${old_tsl_commit:0:12} -> ${new_tsl_commit:0:12}"

if [[ "$DRY_RUN" == true ]]; then
  echo "Dry run: would commit with message: ${COMMIT_MESSAGE}"
  exit 0
fi

git -C "$SITE_ROOT" add lib/tsl
git -C "$SITE_ROOT" commit -m "$COMMIT_MESSAGE"
