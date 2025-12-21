#!/bin/bash

echo "Getting last commit time of files tracked by git..."

my_path=$(realpath "$0")
my_dir=$(dirname "$my_path")
workspace=$(dirname "$my_dir")
history_repo=$workspace/website_history

history_file="history.csv.tmp"
history_file_target="$history_repo"/history.csv

git_files=$(git ls-tree -r master --name-only)

set -x
rm -f "$history_file"
set +x
for fn in $git_files
do
    echo -n "$fn," >> $history_file
    git log -1 --format=%cs "$fn" >> $history_file
done

set -x
mv $history_file "$history_file_target"

cd "$history_repo" || return
git pull
git status
git --no-pager diff "$history_file_target"

git add "$history_file_target"
# this has no effect if nothing changed
git commit -m "update history"
