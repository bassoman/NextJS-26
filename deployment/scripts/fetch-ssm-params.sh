#!/usr/bin/env bash
# ==============================================================================
# fetch-ssm-params.sh
# Retrieves configuration and credentials from AWS SSM Parameter Store
# and exports them to a secure environment file under /etc/carc.
# ==============================================================================

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

echo "[$(date -u +%FT%TZ)] Fetching SSM parameters under path: ${SSM_PATH} (Region: ${AWS_REGION})"

# Verify AWS CLI is installed
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

# Fetch all parameters recursively under the path with decryption
# Formats parameter name /carc/{environment}/FOO -> FOO=Value
aws ssm get-parameters-by-path \
    --path "$SSM_PATH" \
    --recursive \
    --with-decryption \
    --region "$AWS_REGION" \
    --query "Parameters[*].[Name,Value]" \
    --output text | while IFS=$'\t' read -r param_name param_value; do
        if [[ -n "$param_name" && -n "$param_value" ]]; then
            # Extract only the key name after the last slash
            key_name="${param_name##*/}"
            echo "${key_name}=${param_value}" >> "$TEMP_ENV_FILE"
        fi
    done

if [[ ! -s "$TEMP_ENV_FILE" ]]; then
    echo "WARNING: No parameters were fetched from SSM under path '${SSM_PATH}'." >&2
    echo "Check IAM credentials and ensure parameters exist in SSM Parameter Store." >&2
    exit 1
fi

# Each environment has its own host data directory via Docker Compose. Keep the
# path inside the container stable so application code does not vary by target.
if ! grep -q "^SQLITE_DATABASE_PATH=" "$TEMP_ENV_FILE"; then
    echo "SQLITE_DATABASE_PATH=/app/data/carc.db" >> "$TEMP_ENV_FILE"
fi

if ! grep -q "^NEXT_PUBLIC_PAYPAL_ENVIRONMENT=" "$TEMP_ENV_FILE"; then
    echo "NEXT_PUBLIC_PAYPAL_ENVIRONMENT=$([[ "$CARC_ENVIRONMENT" == "sandbox" ]] && echo sandbox || echo live)" >> "$TEMP_ENV_FILE"
fi

# Atomic replace and set secure permissions
mv "$TEMP_ENV_FILE" "$TARGET_ENV_FILE"
chmod 600 "$TARGET_ENV_FILE"

echo "[$(date -u +%FT%TZ)] Successfully wrote $(wc -l < "$TARGET_ENV_FILE") environment variables to ${TARGET_ENV_FILE}"
