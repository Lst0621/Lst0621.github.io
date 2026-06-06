#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

sed -i 's/_SL[0-9]\+_\.//g' "${REPO_ROOT}/resource/lib_of_hj.psv"
sed -i 's/_SL[0-9]\+_\.//g' "${REPO_ROOT}/resource/reading.psv"

git -C "${REPO_ROOT}" diff resource
