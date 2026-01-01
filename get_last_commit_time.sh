#!/bin/bash

echo "Getting last commit time of files tracked by git..."

my_path=$(realpath "$0")
my_dir=$(dirname "$my_path")
workspace=$(dirname "$my_dir")
history_repo=$workspace/website_history

history_file="history.csv.tmp"
absolute_history_file=$my_dir/$history_file
history_file_target="$history_repo"/history.csv

set -x

cd "$history_repo" ||return
git checkout main
git pull
cd -

rm -f "$history_file"

# Get main repository files
git_files=$(git ls-tree -r master --name-only)

# Process main repository files
set +x
for fn in $git_files
do
    echo -n "$fn," >> $history_file
    git log -1 --format=%cs "$fn" >> $history_file
done

# Process submodule files
git submodule foreach --quiet --recursive "
    echo \"$history_file\"
    for file in \$(git ls-tree -r HEAD --name-only); do
        echo  \"\$sm_path/\$file,\"
        git log -1 --format=%cs \"\$file\"
        echo -n \"\$sm_path/\$file,\" >> \"$absolute_history_file\"
        git log -1 --format=%cs \"\$file\" >> \"$absolute_history_file\"
    done
"

set -x
mv $history_file "$history_file_target"

cd "$history_repo" || return
git status
git --no-pager diff "$history_file_target"

git add "$history_file_target"
# this has no effect if nothing changed
git commit -m "update history"
