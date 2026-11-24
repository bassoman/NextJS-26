#!/usr/bin/env bash
# One-shot setup for a fresh Ubuntu Lightsail instance.
# Follows production-standard architecture with multi-admin isolation.
#
# Usage (as a non-root user with sudo access):
#   DOMAIN=example.com EMAIL=you@example.com bash deployment/scripts/lightsail-setup.sh
#   DOMAIN=example.com EMAIL=you@example.com bash deployment/scripts/lightsail-setup.sh --init
#
# Optional variables:
#   APP_DIR         Application directory (default /var/www/carc-app)
#   DOMAIN          Enable HTTPS with this domain name
#   EMAIL           Let's Encrypt contact email (required with DOMAIN)
#   REPO_URL        Git repository URL (default: https://github.com/bassoman/NextJS-26.git)
#   REPO_BRANCH     Git branch to clone (default: main)
#   WWW_ALIAS       0 = skip www.DOMAIN (default 1)
#
# Options:
#   --init          Install and configure without enabling or starting services
#
# Architecture:
#   - App runs from /var/www/carc-app (FHS-compliant)
#   - Service user: www-data (unprivileged runtime)
#   - Admin group: webadmins (all administrators)
#   - Deployer group: deployers (subset authorized for deployments)
set -Eeuo pipefail

DOMAIN="${DOMAIN:-}"
EMAIL="${EMAIL:-}"
REPO_URL="${REPO_URL:-https://github.com/bassoman/NextJS-26.git}"
REPO_BRANCH="${REPO_BRANCH:-main}"
APP_DIR="${APP_DIR:-/var/www/carc-app}"
PORT=3000
SERVICE_USER="${CARC_SERVICE_USER:-www-data}"
SERVICE_GROUP="${CARC_SERVICE_GROUP:-webadmins}"
INIT_ONLY=0

while (($#)); do
    case "$1" in
        --init)
            INIT_ONLY=1
            ;;
        -h|--help)
            echo "Usage: $0 [--init]"
            echo "  --init    Install and configure without enabling or starting services"
            exit 0
            ;;
        *)
            echo "Unknown option: $1" >&2
            echo "Usage: $0 [--init]" >&2
            exit 2
            ;;
    esac
    shift
done

if [[ $EUID -eq 0 ]]; then
    echo "Run as a non-root user with sudo access (not as root)" >&2
    exit 1
fi

echo "==> Installing packages"
sudo apt-get update
sudo apt-get install -y git build-essential python3 nginx sqlite3 curl
if ! command -v node >/dev/null || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]]; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "==> Adding 2G swap if none exists (needed for next build on small plans)"
if ! swapon --show | grep -q .; then
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

echo "==> Preparing /var/www for deployment"
# Ensure parent directory exists and can be written to by current user
sudo mkdir -p /var/www
sudo chown www-data:webadmins /var/www
sudo chmod 775 /var/www
sudo chmod g+s /var/www

echo "==> Fetching code into $APP_DIR"
if [[ -d "$APP_DIR/.git" ]]; then
    # If directory already exists, ensure we're on the right branch
    sudo chown -R "$(id -u):$(id -g)" "$APP_DIR"
    git -C "$APP_DIR" checkout "$REPO_BRANCH"
    git -C "$APP_DIR" pull --ff-only "$REPO_URL" "$REPO_BRANCH"
else
    # Create directory writable by current user for git clone
    sudo mkdir -p "$APP_DIR"
    sudo chown "$(id -u):$(id -g)" "$APP_DIR"
    git clone --branch "$REPO_BRANCH" "$REPO_URL" "$APP_DIR"
fi

# Now fix ownership to www-data:webadmins (after all git operations)
sudo chown -R www-data:webadmins "$APP_DIR"
sudo chmod -R u+rwX,g+rwX,o+rX "$APP_DIR"
sudo find "$APP_DIR" -type d -exec chmod g+s {} +
# Configure git to trust the www-data owned directory
git config --global --add safe.directory "$APP_DIR"
cd "$APP_DIR"

echo "==> Initializing deployment users and directories"
sudo bash "$APP_DIR/deployment/scripts/setup-deployment-users.sh" --init-directories

echo "==> Environment file"
ENV_FILE="$APP_DIR/.env"
if [[ ! -f "$ENV_FILE" ]]; then
    echo "Fetching environment variables from AWS SSM (/carc/prod/*)"
    # Requires the AWS CLI configured with read access to /carc/prod/*
    sudo -E env "PATH=$PATH" APP_DIR="$APP_DIR" bash "$APP_DIR/deployment/scripts/fetch-ssm-params.sh"
    sudo chown "$SERVICE_USER:$SERVICE_GROUP" "$ENV_FILE"
    sudo chmod 640 "$ENV_FILE"
fi

echo "==> Building"
# NEXT_PUBLIC_* values are inlined at build time, so export them from the env file first.
while IFS= read -r line; do
    [[ "$line" =~ ^(NEXT_PUBLIC_[A-Za-z0-9_]*)=(.*)$ ]] && export "${BASH_REMATCH[1]}=${BASH_REMATCH[2]}"
done < "$ENV_FILE"

# Fix npm cache permissions (can be created by root on first run)
sudo chown -R www-data:webadmins /var/www/.npm 2>/dev/null || true

# Install dependencies and build as www-data
sudo -u "$SERVICE_USER" npm install
sudo -u "$SERVICE_USER" npm run build

echo "==> Initializing databases (skipped if already present or no source DB)"
if [[ -f "$APP_DIR/frontend/data/carc.db" && ! -e /var/carc/prod/data/carc.db ]]; then
    sudo bash "$APP_DIR/deployment/scripts/initialize-databases.sh"
else
    echo "Skipping: source DB missing or prod DB already exists."
    echo "Copy frontend/data/carc.db to the server and re-run initialize-databases.sh if needed."
fi

echo "==> Fixing database permissions"
sudo env CARC_SERVICE_USER="$SERVICE_USER" CARC_SERVICE_GROUP="$SERVICE_GROUP" \
    bash "$APP_DIR/deployment/scripts/fix-database-permissions.sh"

echo "==> systemd services"
sudo cp "$APP_DIR/deployment/systemd"/* /etc/systemd/system/
sudo systemctl daemon-reload
if [[ "$INIT_ONLY" == "1" ]]; then
    echo "Initialization mode: not enabling or starting carc-app@prod or carc-backup.timer."
else
    sudo systemctl enable carc-app@prod
    sudo systemctl restart carc-app@prod
    sudo systemctl enable --now carc-backup.timer
fi

echo "==> nginx / HTTPS"
DOMAIN="$DOMAIN" EMAIL="$EMAIL" APP_DIR="$APP_DIR" APP_PORT="$PORT" \
    bash "$APP_DIR/deployment/scripts/configure-nginx.sh"

if [[ "$INIT_ONLY" == "1" ]]; then
    echo "==> Initialization complete. SSM helper: $APP_DIR/deployment/scripts/ssm-write.sh"
    echo "    After writing parameters with ssm-write, refresh .env with fetch-ssm-params.sh before starting services."
else
    echo "==> Done. Status:"
    systemctl --no-pager status carc-app@prod | head -5
    curl -sI "http://127.0.0.1:${PORT}" | head -1 || true
fi
