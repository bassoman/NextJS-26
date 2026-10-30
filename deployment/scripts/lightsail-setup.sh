#!/usr/bin/env bash
# One-shot setup for a fresh Ubuntu Lightsail instance.
# Usage (as the ubuntu user):
#   DOMAIN=example.com EMAIL=you@example.com bash deployment/scripts/lightsail-setup.sh
# Optional: APP_DIR (default ~/NextJS-26), WWW_ALIAS=0, see configure-nginx.sh for more.
# DOMAIN/EMAIL are optional; without them nginx serves plain HTTP on the IP.
# USE_SSM=1 pulls env values from AWS SSM (/carc/prod/*) instead of prompting.
# Env file: put your secrets in /etc/carc/prod.env beforehand, or edit it when prompted.
set -Eeuo pipefail

DOMAIN="${DOMAIN:-}"
EMAIL="${EMAIL:-}"
REPO_URL="${REPO_URL:-https://github.com/bassoman/NextJS-26.git}"
APP_DIR="${APP_DIR:-$HOME/NextJS-26}"
PORT=3000

if [[ $EUID -eq 0 ]]; then
    echo "Run as the ubuntu user (not root); sudo is used where needed." >&2
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

echo "==> Fetching code"
if [[ -d "$APP_DIR/.git" ]]; then
    git -C "$APP_DIR" pull --ff-only
else
    git clone "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR"

echo "==> Environment file"
sudo mkdir -p /etc/carc
if [[ ! -f /etc/carc/prod.env ]]; then
    if [[ "${USE_SSM:-0}" == "1" ]]; then
        # Requires the AWS CLI configured with read access to /carc/prod/*
        sudo -E env "PATH=$PATH" bash deployment/scripts/fetch-ssm-params.sh
    else
        sudo install -m 600 -o root -g root /dev/null /etc/carc/prod.env
        echo "Paste your production env (KEY=value lines), then Ctrl-D. Leave empty to edit later:"
        sudo tee /etc/carc/prod.env >/dev/null
        {
            echo "PORT=$PORT"
            echo "SQLITE_DATABASE_PATH=/var/carc/prod/data/carc.db"
        } | sudo tee -a /etc/carc/prod.env >/dev/null
    fi
fi

echo "==> Building"
# NEXT_PUBLIC_* values are inlined at build time, so export them from the env file first.
while IFS= read -r line; do
    [[ "$line" =~ ^(NEXT_PUBLIC_[A-Za-z0-9_]*)=(.*)$ ]] && export "${BASH_REMATCH[1]}=${BASH_REMATCH[2]}"
done < <(sudo cat /etc/carc/prod.env)
npm ci
npm run build

echo "==> Initializing databases (skipped if already present or no source DB)"
if [[ -f frontend/data/carc.db && ! -e /var/carc/prod/data/carc.db ]]; then
    sudo bash deployment/scripts/initialize-databases.sh
else
    echo "Skipping: source DB missing or prod DB already exists."
    echo "Copy frontend/data/carc.db to the server and re-run initialize-databases.sh if needed."
fi

echo "==> systemd services"
sudo cp deployment/systemd/* /etc/systemd/system/
sudo sed -i "s|^WorkingDirectory=.*|WorkingDirectory=${APP_DIR}|" /etc/systemd/system/carc-app@.service
sudo systemctl daemon-reload
sudo systemctl enable carc-app@prod
sudo systemctl restart carc-app@prod
sudo systemctl enable --now carc-backup.timer

echo "==> nginx / HTTPS"
DOMAIN="$DOMAIN" EMAIL="$EMAIL" APP_DIR="$APP_DIR" APP_PORT="$PORT" \
    bash deployment/scripts/configure-nginx.sh

echo "==> Done. Status:"
systemctl --no-pager status carc-app@prod | head -5
curl -sI "http://127.0.0.1:${PORT}" | head -1 || true
