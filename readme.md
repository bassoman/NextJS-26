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
  * SQLite databases are mounted from `/var/carc/prod/data` or `/var/carc/sandbox/data` to `/app/data` inside the selected container.
* **AWS SSM Parameter Store**:
  * Securely stores all PayPal and application secrets.
  * Synchronized into `/etc/carc/prod.env` or `/etc/carc/sandbox.env` on the host prior to container start.

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
 │  │  - Env: /etc/carc/{prod|sandbox}.env              │  │
 │  └──────────────────────────┬────────────────────────┘  │
 │                             │ Mount /app/data           │
 │                             ▼                           │
 │  ┌───────────────────────────────────────────────────┐  │
 │  │ Host Storage: /var/carc/{prod|sandbox}/data       │  │
 │  │ Backups: /var/carc/backups/hourly                 │  │
 │  └───────────────────────────────────────────────────┘  │
 └─────────────────────────────────────────────────────────┘
```

---

## 2. Persistent Data File Location

SQLite is a file-based embedded database. Each deployment environment has its own host database so sandbox transactions cannot touch production data.

* **Production Database Path**: `/var/carc/prod/data/carc.db`
* **Sandbox Database Path**: `/var/carc/sandbox/data/carc.db`
* **Container Mount Point**: `/app/data`
* **Container Database Path**: `/app/data/carc.db` (configured via `SQLITE_DATABASE_PATH`)
* **Host Backup Path**: `/var/carc/backups/hourly/`

### Initializing Host Storage on Lightsail VPS:
```bash
sudo mkdir -p /var/carc/prod/data /var/carc/sandbox/data /var/carc/backups/hourly /etc/carc
sudo chown -R 1001:1001 /var/carc/prod/data /var/carc/sandbox/data
sudo chmod 750 /var/carc/prod/data /var/carc/sandbox/data
```

*(UID/GID `1001:1001` corresponds to the unprivileged `nextjs:nodejs` user inside the container).*

---

## 3. AWS SSM Parameter Store Configuration

To avoid committing sensitive API keys to Git, credentials are saved in **AWS Systems Manager (SSM) Parameter Store**.

### Required Parameters
Create the following parameters under both `/carc/prod/` and `/carc/sandbox/` in SSM Parameter Store (e.g., in region `us-west-2`). Use live PayPal credentials and `https://api-m.paypal.com` for prod; use sandbox credentials and `https://api-m.sandbox.paypal.com` for sandbox.

| Parameter Name | Type | Value / Description |
| :--- | :--- | :--- |
| `/carc/{environment}/PAYPAL_CLIENT_ID` | `SecureString` | Matching PayPal REST client ID |
| `/carc/{environment}/PAYPAL_CLIENT_SECRET` | `SecureString` | Matching PayPal REST client secret |
| `/carc/{environment}/PAYPAL_BASE_URL` | `String` | Live or sandbox PayPal API URL |
| `/carc/{environment}/NEXT_PUBLIC_PAYPAL_CLIENT_ID` | `String` | Matching public client ID for Smart Buttons |
| `/carc/{environment}/NEXT_PUBLIC_PAYPAL_ENVIRONMENT` | `String` | `live` for prod, `sandbox` for sandbox |
| `/carc/{environment}/CARC_DATABASE_MODE` | `String` | `live` |
| `/carc/{environment}/SQLITE_DATABASE_PATH` | `String` | `/app/data/carc.db` |

### Setting Up Parameters via AWS CLI:
```bash
aws ssm put-parameter --name "/carc/sandbox/PAYPAL_CLIENT_ID" --value "YOUR_SANDBOX_CLIENT_ID" --type "SecureString" --overwrite
aws ssm put-parameter --name "/carc/sandbox/PAYPAL_CLIENT_SECRET" --value "YOUR_SANDBOX_CLIENT_SECRET" --type "SecureString" --overwrite
aws ssm put-parameter --name "/carc/sandbox/PAYPAL_BASE_URL" --value "https://api-m.sandbox.paypal.com" --type "String" --overwrite
aws ssm put-parameter --name "/carc/sandbox/NEXT_PUBLIC_PAYPAL_CLIENT_ID" --value "YOUR_SANDBOX_CLIENT_ID" --type "String" --overwrite
aws ssm put-parameter --name "/carc/sandbox/NEXT_PUBLIC_PAYPAL_ENVIRONMENT" --value "sandbox" --type "String" --overwrite

# Repeat the same keys under /carc/prod with live values and environment=live.
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
      "Resource": "arn:aws:ssm:*:*:parameter/carc/*"
    }
  ]
}
```

### Fetching Secrets on the Lightsail VPS
Run the included synchronization script:
```bash
chmod +x deployment/scripts/fetch-ssm-params.sh
sudo CARC_ENVIRONMENT=prod ./deployment/scripts/fetch-ssm-params.sh

# For sandbox instead:
sudo CARC_ENVIRONMENT=sandbox ./deployment/scripts/fetch-ssm-params.sh
```
This populates `/etc/carc/prod.env` or `/etc/carc/sandbox.env` with restricted permissions (`chmod 600`).

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

# Initialize isolated data directories
sudo mkdir -p /var/carc/prod/data /var/carc/sandbox/data /var/carc/backups/hourly /etc/carc
sudo chown -R 1001:1001 /var/carc/prod/data /var/carc/sandbox/data

# Sync production parameters from AWS SSM
chmod +x deployment/scripts/fetch-ssm-params.sh
sudo AWS_REGION=us-west-2 CARC_ENVIRONMENT=prod ./deployment/scripts/fetch-ssm-params.sh
```

### Step 4: Launch Application with Docker Compose
```bash
# Set your domain variables (or edit .env)
export DOMAIN_NAME="coastsidearc.org"
export WWW_DOMAIN_NAME="www.coastsidearc.org"
export ACME_EMAIL="admin@coastsidearc.org"
export CARC_ENVIRONMENT="prod"

# Build and start both Next.js and Caddy
docker compose up -d --build
```

Verify running containers:
```bash
docker compose ps
docker compose logs -f
```

### Switching Lightsail to Sandbox
The selector controls both the SSM path and the host database directory. Stop the current environment before switching because the Compose service uses a fixed container name and public domain:
```bash
cd /home/ubuntu/carc-web
sudo AWS_REGION=us-west-2 CARC_ENVIRONMENT=sandbox ./deployment/scripts/fetch-ssm-params.sh
CARC_ENVIRONMENT=sandbox docker compose down
CARC_ENVIRONMENT=sandbox docker compose up -d
CARC_ENVIRONMENT=sandbox docker compose ps
```
Switch back to production by using `CARC_ENVIRONMENT=prod` in each command. The application container reads the PayPal client ID at runtime from the selected env file, so a rebuild is not required just to change credentials.

### Initializing Both Environment Databases
The repository includes `frontend/data/carc.db` as the source database. The initialization script uses SQLite's `.backup` operation, which safely includes WAL contents, and replaces both target database files. Stop the application first and make backups before running it:
```bash
cd /home/ubuntu/carc-web
CARC_DB_FILE=/var/carc/prod/data/carc.db \
  CARC_BACKUP_DIR=/var/carc/backups/hourly/prod \
  ./frontend/scripts/backup-sqlite.sh

sudo ./deployment/scripts/initialize-databases.sh
```
The targets are `/var/carc/prod/data/carc.db` and `/var/carc/sandbox/data/carc.db`. Override them with `CARC_PROD_DB`, `CARC_SANDBOX_DB`, or `CARC_SOURCE_DB` when necessary.

### Clearing Transactions for a Test
`CARC_CLEAR_TRANSACTIONS` is intentionally not stored in SSM or either environment file. To clear all rows from the `pp_tnx` table in the selected database, stop the current app and pass the variable only on the command that starts it:
```bash
CARC_ENVIRONMENT=sandbox CARC_CLEAR_TRANSACTIONS=1 docker compose up -d
```
Use `CARC_ENVIRONMENT=prod` only when you deliberately intend to clear production transactions. The entrypoint clears transactions before starting Next.js and then the variable is absent from normal launches:
```bash
CARC_ENVIRONMENT=sandbox docker compose up -d
```
The clearing operation does not remove member or other reference data. Verify the selected environment and database backup before using it.

---

## 6. Automated SQLite Backups

The SQLite database uses WAL mode. Hourly backups are taken using `sqlite3 .backup` to ensure zero database locking or corruption:

```bash
# Test a manual production backup
sudo CARC_DB_FILE=/var/carc/prod/data/carc.db CARC_BACKUP_DIR=/var/carc/backups/hourly/prod ./frontend/scripts/backup-sqlite.sh

# Test a manual sandbox backup
sudo CARC_DB_FILE=/var/carc/sandbox/data/carc.db CARC_BACKUP_DIR=/var/carc/backups/hourly/sandbox ./frontend/scripts/backup-sqlite.sh
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


