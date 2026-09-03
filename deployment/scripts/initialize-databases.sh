#!/usr/bin/env bash

set -Eeuo pipefail
umask 077

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SOURCE_DB="${CARC_SOURCE_DB:-${REPO_DIR}/frontend/data/carc.db}"
PROD_DB="${CARC_PROD_DB:-/var/carc/prod/data/carc.db}"
SANDBOX_DB="${CARC_SANDBOX_DB:-/var/carc/sandbox/data/carc.db}"

if ! command -v sqlite3 >/dev/null 2>&1; then
    echo "ERROR: sqlite3 is required to initialize the databases." >&2
    exit 1
fi

if [[ ! -f "$SOURCE_DB" ]]; then
    echo "ERROR: Source database not found: $SOURCE_DB" >&2
    exit 1
fi

for target_db in "$PROD_DB" "$SANDBOX_DB"; do
    if [[ "$target_db" == "$SOURCE_DB" ]]; then
        echo "ERROR: Refusing to overwrite the source database." >&2
        exit 1
    fi

    mkdir -p "$(dirname "$target_db")"
    rm -f "$target_db" "${target_db}-wal" "${target_db}-shm"
    sqlite3 "$SOURCE_DB" ".backup '$target_db'"
    chown 1001:1001 "$target_db"
    chmod 660 "$target_db"
    echo "Initialized $target_db from $SOURCE_DB"
done