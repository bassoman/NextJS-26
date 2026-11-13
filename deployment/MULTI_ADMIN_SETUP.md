# Multi-Admin Deployment Architecture

This document describes the production-standard multi-admin deployment model for CARC, following Linux Filesystem Hierarchy Standard (FHS) and industry best practices for secure, scalable multi-user access.

---

## Architecture Overview

### Directory Structure
```
/var/www/carc-app/              # Application root (www-data:webadmins, 775, g+s on dirs)
├── .git/                       # Git repository
├── frontend/                   # Next.js application
├── deployment/                 # Deployment scripts
├── .env                        # Environment file (mode 640, www-data:webadmins)
└── ...other app files...

/var/carc/prod/data/            # Production database (www-data:webadmins, 770, g+s)
/var/carc/sandbox/data/         # Sandbox database (www-data:webadmins, 770, g+s)
```

### User & Group Model

| User/Group | Role | SSH Access | Home Dir | Purpose |
|------------|------|-----------|----------|---------|
| `www-data` | Service account | ❌ | /usr/sbin | Runs Node.js application |
| `alice` | Deployer | ✅ | /home/alice | Can read/write code, restart services, run builds |
| `bob` | Webadmin | ✅ | /home/bob | Can read/write code, but cannot restart services |
| `webadmins` | Group | — | — | All administrators (code access) |
| `deployers` | Group | — | — | Subset authorized for deployments (service control) |

### Permission Model

| User/Group | `/var/www/carc-app` | `.env` | Build Scripts | systemctl restart | Database |
|------------|---------------------|--------|---------------|-------------------|----------|
| www-data | ✅ Read+Exec | ✅ Read | — | — | ✅ Read+Write |
| webadmins | ✅ Read+Write | ✅ Read | ✅ View | ❌ | ✅ Read |
| deployers | ✅ Read+Write | ✅ Read | ✅ **RUN** | ✅ **YES** (sudo) | ✅ Read+Write |
| root | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full |

---

## Initial Setup

### 1. Deploy Fresh Instance

Run this on a new Ubuntu Lightsail instance (as a non-root user):

```bash
# SSH into the instance
ssh ubuntu@<static-ip>

# Clone the repository
git clone https://github.com/bassoman/NextJS-26.git
cd NextJS-26

# Run the setup script
DOMAIN=example.com EMAIL=admin@example.com bash deployment/scripts/lightsail-setup.sh
```

This script will:
1. Install Node 22, nginx, sqlite3, build tools, and swap
2. Clone/pull the repo into `/var/www/carc-app`
3. Create groups: `webadmins`, `deployers`
4. Initialize `/var/www/carc-app` with proper ownership (www-data:webadmins) and permissions (775, g+s)
5. Build the application
6. Initialize databases at `/var/carc/{prod,sandbox}/data/`
7. Install and start systemd services
8. Configure nginx with optional HTTPS

### 2. Create Admin Users

After initial setup, add team members:

```bash
# SSH into the server as ubuntu or any member of the webadmins group

# Add a deployer user (can restart services)
sudo bash /var/www/carc-app/deployment/scripts/setup-deployment-users.sh \
  --user alice --password "initial-password" --deployer --pubkey alice_id_rsa.pub

# Add a regular webadmin (read-only on deployment)
sudo bash /var/www/carc-app/deployment/scripts/setup-deployment-users.sh \
  --user bob --password "initial-password" --pubkey bob_id_rsa.pub
```

Options:
- `--user <username>` – Create a system user
- `--password <password>` – Set password (prompted if omitted)
- `--pubkey <path>` – Add SSH public key file
- `--deployer` – Add to `deployers` group (service restart permissions)

---

## Day-to-Day Operations

### For Deployers (alice)

```bash
# SSH in
ssh alice@example.com

# Update code
cd /var/www/carc-app
git pull origin main

# Install dependencies and build
npm ci
npm run build

# Restart the application
sudo systemctl restart carc-app@prod

# Check status
sudo systemctl status carc-app@prod

# View logs
sudo journalctl -u carc-app@prod -f
```

### For Webadmins (bob)

```bash
# SSH in
ssh bob@example.com

# Read-only code review
cd /var/www/carc-app
git log --oneline -5
cat frontend/src/app/page.tsx

# Can read database files
ls -la /var/carc/prod/data/

# View logs
journalctl -u carc-app@prod -20

# CANNOT:
# - git pull (read-only to the code)
# - npm install or npm run build
# - sudo systemctl restart (sudoers rule restricts this)
```

### Database Backups

Backups are created hourly via systemd timer:

```bash
# Check backup status
systemctl status carc-backup.timer

# Manual backup
bash /var/www/carc-app/frontend/scripts/backup-sqlite.sh
```

---

## Sudoers Configuration

Deployers have password-free sudo for these commands:

```sudoers
# File: /etc/sudoers.d/carc-deployers (created automatically by setup-deployment-users.sh)

%deployers ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart carc-app@prod
%deployers ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart carc-app@sandbox
%deployers ALL=(ALL) NOPASSWD: /usr/bin/systemctl status carc-app@prod
%deployers ALL=(ALL) NOPASSWD: /usr/bin/systemctl status carc-app@sandbox
%deployers ALL=(ALL) NOPASSWD: /usr/bin/journalctl -u carc-app@prod
%deployers ALL=(ALL) NOPASSWD: /usr/bin/journalctl -u carc-app@sandbox
%deployers ALL=(ALL) NOPASSWD: /usr/bin/sqlite3 /var/carc/prod/data/carc.db
%deployers ALL=(ALL) NOPASSWD: /usr/bin/sqlite3 /var/carc/sandbox/data/carc.db
%deployers ALL=(ALL) NOPASSWD: /usr/bin/bash /var/www/carc-app/frontend/scripts/backup-sqlite.sh
```

---

## Permission Details

### Application Directory (`/var/www/carc-app`)

```
Owner:           www-data:webadmins
File Mode:       775 (rwxrwxr-x)
Directory Mode:  775 + g+s (rwxrwsr-x)
Permissions:
  - www-data:    read, execute (run the app)
  - webadmins:   read, write, execute (manage code)
  - others:      read, execute (nginx proxy, etc.)
```

Why `g+s` (setgid)? When Alice creates a file, it automatically inherits the `webadmins` group instead of her personal group. This prevents Bob from getting "Permission Denied" errors.

### Environment File (`/var/www/carc-app/.env`)

```
Owner:           www-data:webadmins
Mode:            640 (rw-r-----)
Permissions:
  - www-data:    read, write (service reads at startup)
  - webadmins:   read (admins can review config)
  - others:      none (not in group)
```

Secrets stored here:
- PayPal API keys
- Database path
- Admin credentials
- NEXT_PUBLIC_* vars (inlined at build time)

### Database Directories (`/var/carc/{prod,sandbox}/data/`)

```
Owner:           www-data:webadmins
Mode:            770 + g+s (rwxrwx---)
Permissions:
  - www-data:    read, write, execute (app reads/writes DB)
  - webadmins:   read, write, execute (admins manage backups)
  - others:      none
```

---

## Troubleshooting

### "Permission Denied" on Code Checkout

If Alice can't push to `/var/www/carc-app`:

```bash
# Check file ownership and group
ls -ld /var/www/carc-app
# Should show: www-data:webadmins

# Check Alice is in webadmins group
id alice
# Should show: groups=...webadmins...

# If not, add her to the group
sudo usermod -aG webadmins alice

# She needs to log out and back in for group membership to take effect
exit
ssh alice@example.com
```

### "Permission Denied" on Database Files

If Alice can't read the database for backups:

```bash
# Check directory permissions
ls -ld /var/carc/prod/data/
# Should show: www-data:webadmins 770

# Check setgid is set (s in group execute position)
stat /var/carc/prod/data/ | grep Access
# Should show: 0 (2755) for setgid

# Fix if needed
sudo chmod g+s /var/carc/prod/data/
sudo chmod 770 /var/carc/prod/data/
```

### Deployment Restart Requires Password

If Alice is prompted for a password when running `sudo systemctl restart carc-app@prod`:

```bash
# Check Alice is in deployers group
id alice
# Should show: groups=...deployers...

# Verify sudoers rule exists
sudo visudo -c -f /etc/sudoers.d/carc-deployers
# Should output: parse ok

# If deployers group is missing, re-run user setup
sudo bash /var/www/carc-app/deployment/scripts/setup-deployment-users.sh --init-directories
```

### App Fails to Start After First Deploy

Check logs:

```bash
sudo journalctl -u carc-app@prod -n 50 --no-pager
```

Common issues:
- `.env` file not found: ensure it exists at `/var/www/carc-app/.env`
- `.env` permission denied: `sudo chown www-data:webadmins /var/www/carc-app/.env`
- Database permission denied: `sudo chmod g+w /var/carc/prod/data/carc.db`

---

## Migration from Old Setup

If migrating from the old `~/NextJS-26` home-directory model:

### 1. Backup the Current State

```bash
# On the old instance
cd ~/NextJS-26
git log --oneline -1 > /tmp/current-commit.txt
sudo cp /etc/carc/prod.env /tmp/prod.env.backup

# Download backups
scp ubuntu@old-instance:/tmp/current-commit.txt ./
scp ubuntu@old-instance:/tmp/prod.env.backup ./
```

### 2. Run New Setup on Fresh Instance

```bash
# SSH into new instance
DOMAIN=example.com EMAIL=admin@example.com bash deployment/scripts/lightsail-setup.sh

# Paste your environment variables when prompted
# Make sure NEXT_PUBLIC_* vars are included
```

### 3. Add Team Members

```bash
sudo bash /var/www/carc-app/deployment/scripts/setup-deployment-users.sh \
  --user alice --password "pass1" --deployer --pubkey alice.pub \
  --user bob --password "pass2" --pubkey bob.pub
```

### 4. Switch DNS (if applicable)

Once verified, update DNS to point to the new instance.

### 5. Keep Old Instance as Fallback

Don't delete the old instance immediately; keep it as a rollback point for a few days.

---

## Environment Variables & Secrets

### Storing Secrets

Secrets are stored in `/var/www/carc-app/.env` (mode 640):

```bash
# Example .env
PORT=3000
SQLITE_DATABASE_PATH=/var/carc/prod/data/carc.db
NEXT_PUBLIC_API_BASE=https://example.com
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
ADMIN_DIAGNOSTIC_USERNAME=...
ADMIN_DIAGNOSTIC_PASSWORD=...
```

**Do not commit `.env` to git.** It's gitignored by default.

### NEXT_PUBLIC_* Variables

These are inlined at **build time**, so they must be exported before `npm run build`:

```bash
# The build script does this automatically:
# 1. Reads .env file
# 2. Exports all NEXT_PUBLIC_* vars
# 3. Runs npm run build (Next.js inlines them)
```

If you change a `NEXT_PUBLIC_*` variable, you must rebuild:

```bash
cd /var/www/carc-app
nano .env  # Edit the variable
npm ci
npm run build
sudo systemctl restart carc-app@prod
```

### AWS SSM Parameter Store (Optional)

For high-security environments, store secrets in AWS SSM instead of a local `.env` file. This provides:
- **Encryption at rest** (SecureString parameters)
- **Centralized management** across instances
- **Audit logging** (CloudTrail)
- **Easy rotation** without touching the server

#### Quick Start

1. Create parameters in AWS Systems Manager Parameter Store:
   ```
   /carc/prod/PAYPAL_CLIENT_ID       (SecureString)
   /carc/prod/PAYPAL_CLIENT_SECRET   (SecureString)
   /carc/prod/ADMIN_DIAGNOSTIC_USERNAME  (SecureString)
   /carc/prod/NEXT_PUBLIC_API_BASE    (String)
   ...
   ```

2. Create IAM user with `ssm:GetParametersByPath` permission on `/carc/prod/*`

3. On Lightsail: `aws configure` with IAM credentials

4. Run setup with SSM:
   ```bash
   USE_SSM=1 DOMAIN=example.com EMAIL=admin@example.com bash deployment/scripts/lightsail-setup.sh
   ```

The setup script calls `fetch-ssm-params.sh`, which fetches all parameters from `/carc/prod/*` and writes them to `/var/www/carc-app/.env` with proper ownership (`www-data:webadmins`, mode 640).

#### Manual Update

To update parameters later without re-running the full setup:

```bash
sudo bash /var/www/carc-app/deployment/scripts/fetch-ssm-params.sh
sudo systemctl restart carc-app@prod
```

**See [AWS_SSM_SETUP.md](./AWS_SSM_SETUP.md) for detailed instructions.**

---

## Security Considerations

### Principle of Least Privilege

- **www-data** runs the app (can't SSH, can't escalate)
- **webadmins** manage code (can SSH, read/write code)
- **deployers** manage deployments (subset of webadmins, can restart services)
- **root** is rarely needed (only for initial setup and major changes)

### Audit Trail

All admin actions are logged:

```bash
# Login attempts
grep "session opened for user" /var/log/auth.log

# Sudo usage
sudo grep "alice" /var/log/auth.log | grep COMMAND

# Service restarts
sudo journalctl -u carc-app@prod | grep "Started\|Stopped"
```

### Protecting the .env File

```bash
# Ensure only www-data and webadmins can read secrets
ls -l /var/www/carc-app/.env
# Should show: -rw-r----- 1 www-data webadmins

# If compromised, revoke and regenerate
# 1. Rotate all API keys (PayPal, etc.)
# 2. Update .env
# 3. Rebuild and restart
cd /var/www/carc-app
npm run build
sudo systemctl restart carc-app@prod
```

### Preventing Accidental Overwrites

The setgid bit on directories ensures:
- When Alice creates files, Bob can read/write them (group ownership inherited)
- When Bob creates files, Alice can read/write them (group ownership inherited)
- No conflicts if both edit the same codebase

---

## Rollback Procedures

### Quick Rollback to Previous Commit

```bash
cd /var/www/carc-app
git log --oneline -5
git revert <commit-hash>  # or git reset --hard <commit-hash>
npm ci
npm run build
sudo systemctl restart carc-app@prod
```

### Full Rollback to Old Instance

If the new instance is broken:

1. Switch DNS back to the old instance
2. Verify app is working
3. Investigate the issue on the new instance
4. Fix and re-test before switching DNS back

### Database Rollback

SQLite backups are created hourly:

```bash
ls -la /var/carc/prod/backups/
# Restore from backup:
sudo cp /var/carc/prod/backups/carc.db.YYYYMMDD.HHMMSS /var/carc/prod/data/carc.db
sudo chown www-data:webadmins /var/carc/prod/data/carc.db
sudo chmod 660 /var/carc/prod/data/carc.db
sudo systemctl restart carc-app@prod
```

---

## Advanced: Custom Deployment Script

For automated deployments, create a custom script with additional guards:

```bash
#!/bin/bash
# File: /var/www/carc-app/deployment/scripts/deploy.sh
# Wrapper for safe, consistent deployments

set -Eeuo pipefail

if ! groups "$(whoami)" | grep -q deployers; then
    echo "ERROR: Only deployers can run this script" >&2
    exit 1
fi

cd /var/www/carc-app

# Create backup
cp -r .git /tmp/.git.backup.$$

# Fetch and merge
git fetch origin
git merge --ff-only origin/main

# Build
npm ci
npm run build

# Restart
sudo systemctl restart carc-app@prod

# Verify
sleep 2
curl -f http://127.0.0.1:3000/ >/dev/null && echo "✅ Deployment successful" || exit 1
```

---

## Contact & Support

For issues or questions about this setup, see [../setup.md](./setup.md) or contact your system administrator.
