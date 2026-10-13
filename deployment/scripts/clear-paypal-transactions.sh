#!/usr/bin/env bash

set -Eeuo pipefail

CARC_ENVIRONMENT="${1:-}"
case "$CARC_ENVIRONMENT" in
    prod|sandbox) ;;
    *)
        echo "Usage: CARC_CLEAR_TRANSACTIONS=1 $0 <prod|sandbox>" >&2
        exit 2
        ;;
esac

if [[ "${CARC_CLEAR_TRANSACTIONS:-}" != "1" ]]; then
    echo "ERROR: Set CARC_CLEAR_TRANSACTIONS=1 to confirm this destructive operation." >&2
    exit 1
fi

DB_FILE="${CARC_DB_FILE:-/var/carc/${CARC_ENVIRONMENT}/data/carc.db}"
if [[ ! -f "$DB_FILE" ]]; then
    echo "ERROR: SQLite database not found: $DB_FILE" >&2
    exit 1
fi

if ! command -v sqlite3 >/dev/null 2>&1; then
    echo "ERROR: sqlite3 is required to clear transactions." >&2
    exit 1
fi

echo "Clearing PayPal transactions from $DB_FILE"
sqlite3 "$DB_FILE" 'BEGIN IMMEDIATE; DELETE FROM pp_tnx; COMMIT; VACUUM;'
