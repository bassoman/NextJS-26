#!/usr/bin/env bash
# Configure nginx as a reverse proxy for the app, with optional Let's Encrypt HTTPS.
# Usage (as a sudo-capable non-root user):
#   DOMAIN=example.com EMAIL=you@example.com bash deployment/scripts/configure-nginx.sh
#
# Variables (environment, or a file named by NGINX_ENV_FILE, default deployment/nginx.env):
#   DOMAIN                Required for HTTPS. Canonical host name. Unset = plain HTTP catch-all.
#   EMAIL                 Let's Encrypt contact. HTTPS is enabled when DOMAIN and EMAIL are set.
#   ENABLE_HTTPS          1/0. Default: 1 if DOMAIN and EMAIL are set, else 0.
#   WWW_ALIAS             1 = also serve www.DOMAIN and redirect it to DOMAIN (default 1).
#   APP_DIR               Location of the app on the server (default $HOME/NextJS-26).
#                         Not used by nginx (it only proxies); lightsail-setup.sh uses it for systemd.
#   APP_PORT              Port the Next.js app listens on (default 3000).
#   SITE_NAME             nginx site file name (default carc).
#   CLIENT_MAX_BODY_SIZE  Upload limit (default 10m).
#   CERTBOT_STAGING       1 = use the Let's Encrypt staging CA for testing (default 0).
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NGINX_ENV_FILE="${NGINX_ENV_FILE:-$SCRIPT_DIR/../nginx.env}"
if [[ -f "$NGINX_ENV_FILE" ]]; then
    # Variables already set in the environment win over the file.
    while IFS= read -r line || [[ -n "$line" ]]; do
        [[ "$line" =~ ^[[:space:]]*([A-Z_][A-Z0-9_]*)=(.*)$ ]] || continue
        key="${BASH_REMATCH[1]}"
        val="${BASH_REMATCH[2]}"
        val="${val%\"}"; val="${val#\"}"
        [[ -z "${!key:-}" ]] && export "$key=$val"
    done <"$NGINX_ENV_FILE"
fi

DOMAIN="${DOMAIN:-}"
EMAIL="${EMAIL:-}"
WWW_ALIAS="${WWW_ALIAS:-1}"
APP_DIR="${APP_DIR:-$HOME/NextJS-26}"
APP_PORT="${APP_PORT:-3000}"
SITE_NAME="${SITE_NAME:-carc}"
CLIENT_MAX_BODY_SIZE="${CLIENT_MAX_BODY_SIZE:-10m}"
CERTBOT_STAGING="${CERTBOT_STAGING:-0}"
if [[ -n "$DOMAIN" && -n "$EMAIL" ]]; then ENABLE_HTTPS="${ENABLE_HTTPS:-1}"; else ENABLE_HTTPS="${ENABLE_HTTPS:-0}"; fi

if [[ $EUID -eq 0 ]]; then
    echo "Run as a non-root user; sudo is used where needed." >&2
    exit 1
fi
if [[ "$ENABLE_HTTPS" == "1" && ( -z "$DOMAIN" || -z "$EMAIL" ) ]]; then
    echo "HTTPS requires both DOMAIN and EMAIL." >&2
    exit 1
fi
if [[ -n "$DOMAIN" && ! "$DOMAIN" =~ ^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?$ ]]; then
    echo "Invalid DOMAIN: $DOMAIN" >&2
    exit 1
fi
if [[ ! "$APP_PORT" =~ ^[0-9]+$ || ! "$SITE_NAME" =~ ^[A-Za-z0-9._-]+$ || ! "$CLIENT_MAX_BODY_SIZE" =~ ^[0-9]+[kKmMgG]?$ ]]; then
    echo "Invalid APP_PORT, SITE_NAME or CLIENT_MAX_BODY_SIZE." >&2
    exit 1
fi

echo "==> Installing nginx$([[ "$ENABLE_HTTPS" == "1" ]] && echo ' and certbot')"
sudo apt-get update
sudo apt-get install -y nginx
[[ "$ENABLE_HTTPS" == "1" ]] && sudo apt-get install -y certbot python3-certbot-nginx

CONF="/etc/nginx/sites-available/$SITE_NAME"
echo "==> Writing $CONF"
{
    if [[ -n "$DOMAIN" && "$WWW_ALIAS" == "1" ]]; then
        cat <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name www.${DOMAIN};
    return 301 http://${DOMAIN}\$request_uri;
}

EOF
    fi
    cat <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN:-_};
    client_max_body_size ${CLIENT_MAX_BODY_SIZE};

    gzip on;
    gzip_types text/plain text/css application/json application/javascript image/svg+xml;

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$connection_upgrade;
    }
}
EOF
} | sudo tee "$CONF" >/dev/null

# Map for websocket upgrades; lives in conf.d (http context).
sudo tee /etc/nginx/conf.d/connection_upgrade.conf >/dev/null <<'EOF'
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}
EOF

sudo ln -sf "$CONF" "/etc/nginx/sites-enabled/$SITE_NAME"
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl reload nginx

if [[ "$ENABLE_HTTPS" == "1" ]]; then
    echo "==> HTTPS via certbot (DNS for $DOMAIN must already point at this server; ports 80/443 open)"
    domains=(-d "$DOMAIN")
    [[ "$WWW_ALIAS" == "1" ]] && domains+=(-d "www.$DOMAIN")
    staging=()
    [[ "$CERTBOT_STAGING" == "1" ]] && staging=(--staging)
    sudo certbot --nginx "${domains[@]}" -m "$EMAIL" --agree-tos --non-interactive --redirect --hsts "${staging[@]}"
    sudo nginx -t
    sudo systemctl reload nginx
    echo "==> Checking certificate renewal"
    sudo certbot renew --dry-run
fi

SCHEME=http; [[ "$ENABLE_HTTPS" == "1" ]] && SCHEME=https
echo "==> Done. Test: curl -I ${SCHEME}://${DOMAIN:-<server-ip>}"
