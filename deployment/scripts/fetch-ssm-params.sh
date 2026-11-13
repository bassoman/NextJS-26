#!/usr/bin/env bash
# Fetch environment variables from AWS SSM Parameter Store.
# Usage (as root or via sudo):
#   bash fetch-ssm-params.sh
#   CARC_ENVIRONMENT=sandbox bash fetch-ssm-params.sh
#   APP_DIR=/custom/app/path bash fetch-ssm-params.sh
#
# Fetches from SSM path: /carc/prod/* (or /carc/sandbox/*)
# Writes to: /var/www/carc-app/.env (or custom path)

set -Eeuo pipefail
umask 077

# Configuration
CARC_ENVIRONMENT="${CARC_ENVIRONMENT:-prod}"
APP_DIR="${APP_DIR:-/var/www/carc-app}"
SSM_PATH="${CARC_SSM_PATH:-/carc/${CARC_ENVIRONMENT}}"
TARGET_ENV_FILE="${CARC_TARGET_ENV_FILE:-${APP_DIR}/.env}"
SERVICE_USER="${CARC_SERVICE_USER:-www-data}"
SERVICE_GROUP="${CARC_SERVICE_GROUP:-webadmins}"
AWS_REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-us-west-2}}"

# Database and port based on environment
SQLITE_DATABASE_PATH="/var/carc/${CARC_ENVIRONMENT}/data/carc.db"
PORT=3000
if [[ "$CARC_ENVIRONMENT" == "sandbox" ]]; then
    PORT=3001
fi

# Validate environment
case "$CARC_ENVIRONMENT" in
    prod|sandbox) ;;
    *)
        echo "ERROR: CARC_ENVIRONMENT must be 'prod' or 'sandbox'." >&2
        exit 1
        ;;
esac

# Ensure we have a proper directory with correct permissions
TARGET_ENV_DIR="$(dirname "$TARGET_ENV_FILE")"

echo "[$(date -u +%FT%TZ)] Fetching SSM parameters from path: ${SSM_PATH}"
echo "[$(date -u +%FT%TZ)] Environment: ${CARC_ENVIRONMENT}"
echo "[$(date -u +%FT%TZ)] Target file: ${TARGET_ENV_FILE}"
echo "[$(date -u +%FT%TZ)] AWS Region: ${AWS_REGION}"

if ! command -v aws >/dev/null 2>&1; then
    echo "ERROR: AWS CLI is not installed or not in PATH." >&2
    exit 1
fi

# Create target directory with proper permissions
mkdir -p "$TARGET_ENV_DIR"
if [[ $EUID -eq 0 ]]; then
    chown "$SERVICE_USER:$SERVICE_GROUP" "$TARGET_ENV_DIR"
    chmod 755 "$TARGET_ENV_DIR"
fi

TEMP_ENV_FILE="$(mktemp "${TARGET_ENV_FILE}.tmp.XXXXXX")"
cleanup() {
    rm -f "$TEMP_ENV_FILE"
}
trap cleanup EXIT

aws ssm get-parameters-by-path \
    --path "$SSM_PATH" \
    --recursive \
    --with-decryption \
    --region "$AWS_REGION" \
    --query "Parameters[*].[Name,Value]" \
    --output text | while IFS=$'\t' read -r param_name param_value; do
        if [[ -z "$param_name" ]]; then
            continue
        fi

        key_name="${param_name##*/}"
        if [[ ! "$key_name" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
            echo "ERROR: Invalid environment variable name in SSM parameter: $param_name" >&2
            exit 1
        fi

        # These values are defined by the host deployment, not by SSM.
        case "$key_name" in
            SQLITE_DATABASE_PATH|PORT) continue ;;
        esac

        printf '%s=%s\n' "$key_name" "$param_value" >> "$TEMP_ENV_FILE"
    done

if [[ ! -s "$TEMP_ENV_FILE" ]]; then
    echo "WARNING: No parameters were fetched from SSM under path '${SSM_PATH}'." >&2
    echo "Check IAM credentials and ensure parameters exist in SSM Parameter Store." >&2
    exit 1
fi

printf 'SQLITE_DATABASE_PATH=%s\n' "$SQLITE_DATABASE_PATH" >> "$TEMP_ENV_FILE"
printf 'PORT=%s\n' "$PORT" >> "$TEMP_ENV_FILE"

# Move to target location
mv "$TEMP_ENV_FILE" "$TARGET_ENV_FILE"

# Set proper permissions for multi-admin architecture
# Owner: service user, Group: webadmins, Mode: 640 (rw-r-----)
chmod 640 "$TARGET_ENV_FILE"
if [[ $EUID -eq 0 ]]; then
    chown "$SERVICE_USER:$SERVICE_GROUP" "$TARGET_ENV_FILE"
    echo "[$(date -u +%FT%TZ)] File ownership: ${SERVICE_USER}:${SERVICE_GROUP}"
else
    echo "[$(date -u +%FT%TZ)] Note: Run as root to set ownership to ${SERVICE_USER}:${SERVICE_GROUP}"
fi

echo "[$(date -u +%FT%TZ)] Successfully wrote $(wc -l < "$TARGET_ENV_FILE") environment variables to ${TARGET_ENV_FILE}"
echo "[$(date -u +%FT%TZ)] Permissions: mode 640, owner ${SERVICE_USER}:${SERVICE_GROUP}"
