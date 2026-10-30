#!/usr/bin/env bash

set -Eeuo pipefail
umask 077

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SOURCE_DB="${CARC_SOURCE_DB:-${REPO_DIR}/frontend/data/carc.db}"
PROD_DB="${CARC_PROD_DB:-/var/carc/prod/data/carc.db}"
SANDBOX_DB="${CARC_SANDBOX_DB:-/var/carc/sandbox/data/carc.db}"
SERVICE_USER="${CARC_SERVICE_USER:-ubuntu}"
SERVICE_GROUP="${CARC_SERVICE_GROUP:-ubuntu}"

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

    if [[ -e "$target_db" || -e "${target_db}-wal" || -e "${target_db}-shm" ]]; then
        echo "ERROR: Target database or SQLite sidecar already exists; refusing to replace it: $target_db" >&2
        exit 1
    fi

    target_dir="$(dirname "$target_db")"
    mkdir -p "$target_dir"
    chown "$SERVICE_USER:$SERVICE_GROUP" "$target_dir"
    chmod 750 "$target_dir"

    sqlite3 "$SOURCE_DB" ".backup '$target_db'"
    chown "$SERVICE_USER:$SERVICE_GROUP" "$target_db"
    chmod 660 "$target_db"
    echo "Initialized $target_db from $SOURCE_DB"
done
