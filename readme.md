# CARC Website - Production Deployment on AWS Lightsail

This repository contains the Next.js application for the Coastside Amateur Radio Club (CARC) with native SQLite ledger support and integrated PayPal checkout.

---

## 1. Architecture Overview

Production deployment runs on an **AWS Lightsail Linux VPS instance (Ubuntu 22.04 / 24.04)** using Docker and Docker Compose:

* **Next.js Application Container (`carc-frontend`)**:
  * Multi-stage build producing a standalone Node.js bundle.
  * Compiles native C++ bindings for `better-sqlite3`.
  * Runs as an unprivileged user (`nextjs:nodejs`).
  * Binds to port `3000` internally within the Docker network.
* **Caddy Reverse Proxy Container (`carc-caddy`)**:
  * Automatically obtains and renews TLS/SSL certificates via Let's Encrypt / ZeroSSL (ACME).
  * Exposes ports `80` (HTTP), `443` (HTTPS), and `443/udp` (HTTP/3).
  * Proxies client requests to `app:3000`.
* **Persistent Host Storage**:
  * SQLite database (`carc.db`) is mounted from the host at `/var/carc/data` to `/app/data` inside the container.
* **AWS SSM Parameter Store**:
  * Securely stores all PayPal and application secrets.
  * Synchronized into `/etc/carc/production.env` on host prior to container start.

```
[ Internet / Browser ]
         │ (HTTPS :443 / HTTP :80)
         ▼
 ┌─────────────────────────────────────────────────────────┐
 │ AWS Lightsail Linux VPS                                 │
 │                                                         │
 │  ┌───────────────────────────────────────────────────┐  │
 │  │ Caddy Reverse Proxy (carc-caddy)                  │  │
 │  │  - Automatic Let's Encrypt / ZeroSSL TLS          │  │
 │  │  - Ports 80, 443                                  │  │
 │  └──────────────────────────┬────────────────────────┘  │
 │                             │ (Internal HTTP :3000)     │
 │                             ▼                           │
 │  ┌───────────────────────────────────────────────────┐  │
 │  │ Next.js App Container (carc-frontend)             │  │
 │  │  - Standalone Server (Node 22)                    │  │
 │  │  - Native better-sqlite3 engine                   │  │
 │  │  - Env: /etc/carc/production.env                  │  │
 │  └──────────────────────────┬────────────────────────┘  │
 │                             │ Mount /app/data           │
 │                             ▼                           │
 │  ┌───────────────────────────────────────────────────┐  │
 │  │ Host Storage: /var/carc/data/carc.db (WAL mode)   │  │
 │  │ Backups: /var/carc/backups/hourly                 │  │
 │  └───────────────────────────────────────────────────┘  │
 └─────────────────────────────────────────────────────────┘
```

---

## 2. Persistent Data File Location

SQLite is a file-based embedded database. In production, the database must reside on the host filesystem so data persists across container rebuilds and restarts.

* **Host Database Path**: `/var/carc/data/carc.db`
* **Container Mount Point**: `/app/data`
* **Container Database Path**: `/app/data/carc.db` (configured via `SQLITE_DATABASE_PATH`)
* **Host Backup Path**: `/var/carc/backups/hourly/`

### Initializing Host Storage on Lightsail VPS:
```bash
sudo mkdir -p /var/carc/data /var/carc/backups/hourly /etc/carc
sudo chown -R 1001:1001 /var/carc/data
sudo chmod 750 /var/carc/data
```

*(UID/GID `1001:1001` corresponds to the unprivileged `nextjs:nodejs` user inside the container).*

---

## 3. AWS SSM Parameter Store Configuration

To avoid committing sensitive API keys to Git, credentials are saved in **AWS Systems Manager (SSM) Parameter Store**.

### Required Parameters
Create the following parameters in SSM Parameter Store (e.g., in region `us-west-2`):

| Parameter Name | Type | Value / Description |
| :--- | :--- | :--- |
| `/carc/prod/PAYPAL_CLIENT_ID` | `SecureString` | Live PayPal REST Client ID |
| `/carc/prod/PAYPAL_CLIENT_SECRET` | `SecureString` | Live PayPal REST Client Secret |
| `/carc/prod/PAYPAL_BASE_URL` | `String` | `https://api-m.paypal.com` |
| `/carc/prod/NEXT_PUBLIC_PAYPAL_CLIENT_ID` | `String` | Public Live Client ID for frontend Smart Buttons |
| `/carc/prod/NEXT_PUBLIC_PAYPAL_ENVIRONMENT` | `String` | `live` (or `sandbox` for testing) |
| `/carc/prod/CARC_DATABASE_MODE` | `String` | `live` |
| `/carc/prod/SQLITE_DATABASE_PATH` | `String` | `/app/data/carc.db` |

### Setting Up Parameters via AWS CLI:
```bash
aws ssm put-parameter --name "/carc/prod/PAYPAL_CLIENT_ID" --value "YOUR_LIVE_CLIENT_ID" --type "SecureString" --overwrite
aws ssm put-parameter --name "/carc/prod/PAYPAL_CLIENT_SECRET" --value "YOUR_LIVE_CLIENT_SECRET" --type "SecureString" --overwrite
aws ssm put-parameter --name "/carc/prod/PAYPAL_BASE_URL" --value "https://api-m.paypal.com" --type "String" --overwrite
aws ssm put-parameter --name "/carc/prod/NEXT_PUBLIC_PAYPAL_CLIENT_ID" --value "YOUR_LIVE_CLIENT_ID" --type "String" --overwrite
aws ssm put-parameter --name "/carc/prod/NEXT_PUBLIC_PAYPAL_ENVIRONMENT" --value "live" --type "String" --overwrite
aws ssm put-parameter --name "/carc/prod/CARC_DATABASE_MODE" --value "live" --type "String" --overwrite
aws ssm put-parameter --name "/carc/prod/SQLITE_DATABASE_PATH" --value "/app/data/carc.db" --type "String" --overwrite
```

### IAM Permissions
Attach an IAM policy to the AWS credentials used on the Lightsail VPS:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParametersByPath",
        "ssm:GetParameter",
        "ssm:GetParameters"
      ],
      "Resource": "arn:aws:ssm:*:*:parameter/carc/prod/*"
    }
  ]
}
```

### Fetching Secrets on the Lightsail VPS
Run the included synchronization script:
```bash
chmod +x deployment/scripts/fetch-ssm-params.sh
sudo ./deployment/scripts/fetch-ssm-params.sh
```
This populates `/etc/carc/production.env` with restricted permissions (`chmod 600`).

---

## 4. SSL Certificate & Caddy Reverse Proxy

The PayPal JavaScript SDK and Live REST APIs strictly require valid HTTPS/TLS certificates for checkout pop-ups, OAuth callbacks, return URLs, and payment captures.

### Why Caddy?
* **Automatic TLS**: Caddy issues and renews Let's Encrypt / ZeroSSL certificates automatically with zero manual certbot cron jobs.
* **HTTP/3 (QUIC) & HTTP/2**: Provides modern protocol negotiation out of the box.
* **Simple Reverse Proxy**: Transparently proxies traffic to the internal Next.js container while forwarding host, proto, and real client IP headers.

### DNS Setup (Lightsail / Domain Registrar)
1. In the AWS Lightsail console, assign a **Static IP** to your instance.
2. In your DNS provider (e.g., Route 53, Cloudflare, Namecheap), configure:
   * `A` record: `coastsidearc.org` -> `YOUR_LIGHTSAIL_STATIC_IP`
   * `A` record: `www.coastsidearc.org` -> `YOUR_LIGHTSAIL_STATIC_IP`
3. Ensure Lightsail firewall rules allow inbound traffic on **Port 80 (TCP)** and **Port 443 (TCP and UDP for HTTP/3)**.

### Caddy Configuration ([Caddyfile](Caddyfile))
```caddyfile
{
    email {$ACME_EMAIL:admin@coastsidearc.org}
}

{$DOMAIN_NAME:coastsidearc.org}, {$WWW_DOMAIN_NAME:www.coastsidearc.org} {
    encode zstd gzip

    reverse_proxy app:3000 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }

    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
        Referrer-Policy "strict-origin-when-cross-origin"
    }

    log {
        output stdout
        format console
    }
}
```

---

## 5. Step-by-Step Deployment on AWS Lightsail Linux VPS

### Step 1: Install Docker and Docker Compose on Lightsail (Ubuntu)
```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg unzip
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo usermod -aG docker ubuntu
```

### Step 2: Install AWS CLI on Lightsail
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip -q awscliv2.zip
sudo ./aws/install
rm -rf aws awscliv2.zip
aws configure  # Enter Access Key, Secret Key, and Default Region (e.g. us-west-2)
```

### Step 3: Clone Repository and Prepare Environment
```bash
git clone <repository_url> /home/ubuntu/carc-web
cd /home/ubuntu/carc-web

# Initialize data directories
sudo mkdir -p /var/carc/data /var/carc/backups/hourly /etc/carc
sudo chown -R 1001:1001 /var/carc/data

# Sync parameters from AWS SSM
chmod +x deployment/scripts/fetch-ssm-params.sh
sudo AWS_REGION=us-west-2 ./deployment/scripts/fetch-ssm-params.sh
```

### Step 4: Launch Application with Docker Compose
```bash
# Set your domain variables (or edit .env)
export DOMAIN_NAME="coastsidearc.org"
export WWW_DOMAIN_NAME="www.coastsidearc.org"
export ACME_EMAIL="admin@coastsidearc.org"

# Build and start both Next.js and Caddy
docker compose up -d --build
```

Verify running containers:
```bash
docker compose ps
docker compose logs -f
```

---

## 6. Automated SQLite Backups

The SQLite database uses WAL mode. Hourly backups are taken using `sqlite3 .backup` to ensure zero database locking or corruption:

```bash
# Test manual backup
sudo CARC_DB_FILE=/var/carc/data/carc.db CARC_BACKUP_DIR=/var/carc/backups/hourly ./frontend/scripts/backup-sqlite.sh
```

To enable the systemd timer for automatic hourly backups:
```bash
sudo cp deployment/systemd/carc-backup.service /etc/systemd/system/
sudo cp deployment/systemd/carc-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now carc-backup.timer
```

---

## 7. Local Development

### Option A: Running with Docker (Recommended for container parity)
Use the development Docker Compose file (`docker-compose.dev.yml`) which uses [Dockerfile.dev](Dockerfile.dev), bind mounts source files for instant Hot Module Replacement (HMR / Fast Refresh), and preserves container-compiled native `better-sqlite3` binaries:

```bash
# Build and start local development container
docker compose -f docker-compose.dev.yml up --build

# Or run in the background
docker compose -f docker-compose.dev.yml up -d

# View live logs
docker compose -f docker-compose.dev.yml logs -f

# Stop container
docker compose -f docker-compose.dev.yml down
```

The app will be accessible at `http://localhost:3000`. Any edits to `.ts`, `.tsx`, `.css`, or `.js` files on the host are automatically detected and reflected immediately.

### Option B: Running directly on Host Node.js
```bash
npm install
npm run dev --workspace=frontend
```
Create `env_vals/.env.local` for local environment variable overrides.


