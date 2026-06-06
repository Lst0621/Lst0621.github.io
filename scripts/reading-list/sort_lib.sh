#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

sort "${REPO_ROOT}/resource/lib_of_hj.psv" -r -n -k4 -k5 -s -t\| -o "${REPO_ROOT}/resource/lib_of_hj.sorted.psv"
