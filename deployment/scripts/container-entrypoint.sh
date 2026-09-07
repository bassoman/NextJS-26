#!/bin/sh

set -eu

if [ "${CARC_CLEAR_TRANSACTIONS:-}" = "1" ]; then
    echo "Clearing PayPal transactions from $SQLITE_DATABASE_PATH"
    sqlite3 "$SQLITE_DATABASE_PATH" \
        'BEGIN IMMEDIATE; DELETE FROM pp_tnx; COMMIT; VACUUM;'
fi

if [ -f server.js ]; then
    exec node server.js
elif [ -f frontend/server.js ]; then
    exec node frontend/server.js
else
    exec node .next/standalone/frontend/server.js
fi