#!/usr/bin/env bash

set -Eeuo pipefail
umask 077

CARC_ENVIRONMENT="${CARC_ENVIRONMENT:-prod}"
case "$CARC_ENVIRONMENT" in
    prod|sandbox) ;;
    *)
        echo "ERROR: CARC_ENVIRONMENT must be 'prod' or 'sandbox'." >&2
        exit 1
        ;;
esac

SSM_PATH="${CARC_SSM_PATH:-/carc/${CARC_ENVIRONMENT}}"
TARGET_ENV_FILE="${CARC_TARGET_ENV_FILE:-/etc/carc/${CARC_ENVIRONMENT}.env}"
TARGET_ENV_DIR="$(dirname "$TARGET_ENV_FILE")"
AWS_REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-us-west-2}}"
SQLITE_DATABASE_PATH="/var/carc/${CARC_ENVIRONMENT}/data/carc.db"
PORT=3000
if [[ "$CARC_ENVIRONMENT" == "sandbox" ]]; then
    PORT=3001
fi

echo "[$(date -u +%FT%TZ)] Fetching SSM parameters under path: ${SSM_PATH} (Region: ${AWS_REGION})"

if ! command -v aws >/dev/null 2>&1; then
    echo "ERROR: AWS CLI is not installed or not in PATH." >&2
    exit 1
fi

mkdir -p "$TARGET_ENV_DIR"

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

if ! grep -q "^NEXT_PUBLIC_PAYPAL_ENVIRONMENT=" "$TEMP_ENV_FILE"; then
    paypal_environment="live"
    if [[ "$CARC_ENVIRONMENT" == "sandbox" ]]; then
        paypal_environment="sandbox"
    fi
    printf 'NEXT_PUBLIC_PAYPAL_ENVIRONMENT=%s\n' "$paypal_environment" >> "$TEMP_ENV_FILE"
fi

mv "$TEMP_ENV_FILE" "$TARGET_ENV_FILE"
chmod 600 "$TARGET_ENV_FILE"

echo "[$(date -u +%FT%TZ)] Successfully wrote $(wc -l < "$TARGET_ENV_FILE") environment variables to ${TARGET_ENV_FILE}"
