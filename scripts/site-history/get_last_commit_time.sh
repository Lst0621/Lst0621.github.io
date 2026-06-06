#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
OUTPUT_FILE="${REPO_ROOT}/assets/history.csv"
TMP_FILE="${OUTPUT_FILE}.tmp"

echo "Getting last commit time of files tracked by git..."

rm -f "$TMP_FILE"
mkdir -p "$(dirname "$OUTPUT_FILE")"

append_history_entries() {
    local repo_dir="$1"
    local path_prefix="${2:-}"
    local file

    while IFS= read -r file; do
        if [[ "$repo_dir" == "$REPO_ROOT" && "$file" == "assets/history.csv" ]]; then
            continue
        fi

        local full_path="$file"
        if [[ -n "$path_prefix" ]]; then
            full_path="$path_prefix/$file"
        fi

        local last_commit_date
        last_commit_date="$(git -C "$repo_dir" log -1 --format=%cs -- "$file")"
        printf '%s,%s\n' "$full_path" "$last_commit_date" >> "$TMP_FILE"
    done < <(git -C "$repo_dir" ls-files)

    if [[ -f "$repo_dir/.gitmodules" ]]; then
        local submodule_path
        while IFS= read -r submodule_path; do
            [[ -z "$submodule_path" ]] && continue
            if [[ ! -d "$repo_dir/$submodule_path" ]]; then
                continue
            fi

            local next_prefix="$submodule_path"
            if [[ -n "$path_prefix" ]]; then
                next_prefix="$path_prefix/$submodule_path"
            fi

            append_history_entries "$repo_dir/$submodule_path" "$next_prefix"
        done < <(git -C "$repo_dir" config --file "$repo_dir/.gitmodules" --get-regexp '^submodule\..*\.path$' | awk '{print $2}')
    fi
}

append_history_entries "$REPO_ROOT"

mv "$TMP_FILE" "$OUTPUT_FILE"

echo "Wrote $OUTPUT_FILE"
