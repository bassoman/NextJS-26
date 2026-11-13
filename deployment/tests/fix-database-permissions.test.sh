#!/usr/bin/env bash

set -Eeuo pipefail

script="$(cd "$(dirname "${BASH_SOURCE[0]}")/../scripts" && pwd)/fix-database-permissions.sh"
temp_dir="$(mktemp -d)"
trap 'rm -f "$temp_dir/prod/carc.db" "$temp_dir/prod/carc.db-wal" "$temp_dir/prod/carc.db-shm" "$temp_dir/prod/carc.db-journal" "$temp_dir/sandbox/carc.db" "$temp_dir/error"; rmdir --ignore-fail-on-non-empty "$temp_dir/prod" "$temp_dir/sandbox" "$temp_dir" 2>/dev/null || true' EXIT

mkdir "$temp_dir/prod"
printf 'original database' > "$temp_dir/prod/carc.db"
touch "$temp_dir/prod/carc.db-wal" "$temp_dir/prod/carc.db-shm" "$temp_dir/prod/carc.db-journal"
chmod 700 "$temp_dir/prod"
chmod 600 "$temp_dir/prod/"*

export CARC_SERVICE_USER="$(id -un)" CARC_SERVICE_GROUP="$(id -gn)"
export CARC_PROD_DB="$temp_dir/prod/carc.db" CARC_SANDBOX_DB="$temp_dir/missing/carc.db"
bash "$script"

[[ "$(stat -c %a "$temp_dir/prod")" == 2770 ]]
for file in "$CARC_PROD_DB" "$CARC_PROD_DB-wal" "$CARC_PROD_DB-shm" "$CARC_PROD_DB-journal"; do
    [[ "$(stat -c %a "$file")" == 660 ]]
    [[ "$(stat -c %U:%G "$file")" == "$CARC_SERVICE_USER:$CARC_SERVICE_GROUP" ]]
done
[[ "$(stat -c %U:%G "$temp_dir/prod")" == "$CARC_SERVICE_USER:$CARC_SERVICE_GROUP" ]]
[[ "$(cat "$CARC_PROD_DB")" == "original database" ]]
[[ ! -e "$temp_dir/missing" ]]

mkdir "$temp_dir/sandbox"
export CARC_SANDBOX_DB="$temp_dir/sandbox/carc.db"
bash "$script"
[[ ! -e "$CARC_SANDBOX_DB" ]]
printf 'sandbox database' > "$CARC_SANDBOX_DB"
chmod 600 "$CARC_SANDBOX_DB"
bash "$script"
[[ "$(stat -c %a "$temp_dir/sandbox")" == 2770 ]]
[[ "$(stat -c %a "$CARC_SANDBOX_DB")" == 660 ]]
[[ "$(cat "$CARC_SANDBOX_DB")" == "sandbox database" ]]

if CARC_SERVICE_USER=carc-nonexistent-test-user bash "$script" > /dev/null 2>"$temp_dir/error"; then
    echo "Expected invalid ownership to fail" >&2
    exit 1
fi
[[ -s "$temp_dir/error" ]]
echo "Database permission tests passed"
