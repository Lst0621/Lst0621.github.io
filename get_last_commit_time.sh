#!/bin/bash

echo "Getting last commit time of files tracked by git..."

git checkout history
git merge master --no-edit

history_file="history.csv"
rm -f "$history_file"
git_files=$(git ls-tree -r master --name-only)
for fn in $git_files
do
    echo -n "$fn," >> $history_file
    git log -1 --format=%cs "$fn" >> $history_file
done

cat $history_file

git add $history_file
# this has no effect if nothing changed
git commit -m "update history"

git checkout master

