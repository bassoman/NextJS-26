#!/usr/bin/env bash

set -Eeuo pipefail

SERVICE_USER="${CARC_SERVICE_USER:-www-data}"
SERVICE_GROUP="${CARC_SERVICE_GROUP:-webadmins}"
PROD_DB="${CARC_PROD_DB:-/var/carc/prod/data/carc.db}"
SANDBOX_DB="${CARC_SANDBOX_DB:-/var/carc/sandbox/data/carc.db}"

for db in "$PROD_DB" "$SANDBOX_DB"; do
    db_dir="$(dirname "$db")"
    if [[ ! -d "$db_dir" ]]; then
        echo "Skipping missing database directory: $db_dir"
        continue
    fi

    chown "$SERVICE_USER:$SERVICE_GROUP" "$db_dir"
    chmod 2770 "$db_dir"

    for file in "$db" "${db}-wal" "${db}-shm" "${db}-journal"; do
        if [[ -e "$file" ]]; then
            chown "$SERVICE_USER:$SERVICE_GROUP" "$file"
            chmod 660 "$file"
        fi
    done
    echo "Updated database permissions: $db"
done
