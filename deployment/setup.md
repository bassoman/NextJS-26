# AWS Lightsail Setup

Deploys the app on a single Ubuntu Lightsail instance: Node.js app under systemd, nginx reverse proxy, optional Let's Encrypt HTTPS, hourly SQLite backups.

## 1. Create the instance

1. Lightsail console → **Create instance** → Linux/Unix → **OS Only** → Ubuntu 22.04 or 24.04.
2. Pick a plan with **2 GB RAM or more** (the script adds swap, but more is safer for `next build`).
3. **Networking** tab → create and attach a **static IP**.
4. **Networking → IPv4 Firewall**: allow TCP 22, 80 and 443.
5. If using a domain, create a DNS **A record** pointing to the static IP before running the script.

## 2. Prepare your values

Have the production environment variables ready (PayPal keys, admin diagnostic credentials, etc.). On the server they live only in `/etc/carc/prod.env` (loaded by systemd); no `.env.local` is used. `NEXT_PUBLIC_*` values are also read from that file at build time. Do not commit them.

Do not include `PORT` or `SQLITE_DATABASE_PATH`; the script sets them (`3000` and `/var/carc/prod/data/carc.db`).

The database `frontend/data/carc.db` is used to seed the production database. If it isn't in the git checkout, copy it to the server first:

```bash
ssh ubuntu@<static-ip> 'mkdir -p ~/NextJS-26/frontend/data'
scp frontend/data/carc.db ubuntu@<static-ip>:~/NextJS-26/frontend/data/
```

(The script runs `git pull` on an existing checkout, so this is safe. If you'd rather it not pre-exist, run `initialize-databases.sh` manually afterwards.)

## 3. Run the script

SSH in as `ubuntu` and run:

```bash
ssh ubuntu@<static-ip>
curl -fsSLO https://raw.githubusercontent.com/bassoman/NextJS-26/main/deployment/scripts/lightsail-setup.sh
DOMAIN=example.com EMAIL=you@example.com bash lightsail-setup.sh
```

If the repo is private, clone it first (`git clone ... ~/NextJS-26`) and run `bash ~/NextJS-26/deployment/scripts/lightsail-setup.sh`.

| Variable | Required | Purpose |
|----------|----------|---------|
| `DOMAIN` | no | Enables the nginx `server_name` and HTTPS. Without it, the site is served over HTTP on the IP. |
| `EMAIL` | with `DOMAIN` | Let's Encrypt contact (a personal address is fine). |
| `USE_SSM` | no | `1` = fetch env from AWS SSM `/carc/prod/*` instead of prompting (see below). |
| `REPO_URL` | no | Override the git repo URL. |
| `APP_DIR` | no | App location on the server (default `~/NextJS-26`); also written into the systemd unit. |
| `WWW_ALIAS` | no | `0` to skip `www.DOMAIN` (default `1`: served and redirected to `DOMAIN`). |

When prompted, paste the `KEY=value` lines and press **Ctrl-D**.

## 4. What the script does

1. Installs Node 22, nginx, sqlite3, build tools, and adds 2 GB swap if none exists.
2. Clones (or pulls) the repo to `~/NextJS-26`, then `npm ci` and `npm run build`.
3. Writes `/etc/carc/prod.env` (mode 600) if it doesn't already exist.
4. Seeds `/var/carc/prod` and `/var/carc/sandbox` databases via `initialize-databases.sh` (skipped if the prod DB exists or the source DB is missing).
5. Installs the systemd units, starts `carc-app@prod`, and enables the hourly `carc-backup.timer`.
6. Runs `configure-nginx.sh` to proxy nginx to `127.0.0.1:3000`, and runs certbot if `DOMAIN` and `EMAIL` are set.

The script is safe to re-run to deploy updates (it pulls, rebuilds and restarts), and it won't overwrite an existing env file or database.

## 5. Optional: use AWS SSM Parameter Store for env values

Lightsail instances have no IAM role, so this needs an IAM user with access keys on the server:

1. Create parameters (SecureString) named `/carc/prod/<ENV_VAR_NAME>` in `us-west-2` (or set `AWS_REGION`).
2. Create an IAM user allowed `ssm:GetParametersByPath` on `/carc/prod/*` (plus `kms:Decrypt` for the key).
3. On the server: install the AWS CLI and run `aws configure`.
4. Run the script with `USE_SSM=1`.

For a single Lightsail instance, a root-only `/etc/carc/prod.env` is simpler and about as secure.

## 6. Verify

```bash
systemctl status carc-app@prod
journalctl -u carc-app@prod -f
systemctl list-timers carc-backup.timer
curl -I http://127.0.0.1:3000
```

Then browse to `https://<your-domain>` (or `http://<static-ip>`).

## Operations

- **Update:** `cd ~/NextJS-26 && git pull && npm ci && npm run build && sudo systemctl restart carc-app@prod`
- **Edit env:** `sudo nano /etc/carc/prod.env && sudo systemctl restart carc-app@prod`
- **Backups:** produced hourly by `carc-backup`; also enable Lightsail automatic snapshots and copy backups off the instance.
- **Troubleshooting:** build killed → out of memory, use a bigger plan; 502 from nginx → app not running, check `journalctl`; certbot fails → DNS not yet pointing at the IP or port 80 closed.

## 7. nginx and HTTPS (`configure-nginx.sh`)

`deployment/scripts/configure-nginx.sh` can be run on its own (also re-run to change settings):

```bash
DOMAIN=example.com EMAIL=you@example.com APP_DIR=/home/ubuntu/NextJS-26 bash deployment/scripts/configure-nginx.sh
```

Or copy `deployment/nginx.env.example` to `deployment/nginx.env` (gitignored), edit it, and run the script with no arguments. Real environment variables override the file.

| Variable | Default | Purpose |
|----------|---------|---------|
| `DOMAIN` | none | Canonical host name. Unset = plain-HTTP catch-all. |
| `EMAIL` | none | Let's Encrypt contact; with `DOMAIN` enables HTTPS. |
| `ENABLE_HTTPS` | 1 if both set | Force on/off. |
| `WWW_ALIAS` | `1` | Serve `www.DOMAIN`, redirecting to `DOMAIN`, and include it in the cert. |
| `APP_DIR` | `~/NextJS-26` | App directory on the server (systemd `WorkingDirectory` set by `lightsail-setup.sh`). |
| `APP_PORT` | `3000` | Port the Next.js app listens on. |
| `SITE_NAME` | `carc` | nginx site file name. |
| `CLIENT_MAX_BODY_SIZE` | `10m` | Upload limit. |
| `CERTBOT_STAGING` | `0` | `1` uses the Let's Encrypt staging CA (avoids rate limits while testing). |

### Setting up the HTTPS server records

1. **Static IP**: attach one to the instance (Lightsail → Networking), so DNS doesn't break on reboot.
2. **DNS records** at your DNS provider (or a Lightsail DNS zone), pointing at the static IP:

   | Type | Name | Value |
   |------|------|-------|
   | A | `@` (example.com) | `<static IPv4>` |
   | A | `www` | `<static IPv4>` (or `CNAME` to `example.com`) |
   | AAAA | `@`, `www` | only if the instance has IPv6 (otherwise omit) |

   Use a low TTL (300) until it works. With a registrar other than Lightsail DNS, set the nameservers or records there.
3. **Verify propagation** before running the script:
   ```bash
   dig +short example.com
   dig +short www.example.com
   ```
   Both must return the static IP.
4. **Firewall**: Lightsail → Networking → IPv4 (and IPv6) Firewall must allow TCP 80 and 443. Port 80 is needed for the Let's Encrypt HTTP-01 challenge. If `ufw` is enabled on the server, run `sudo ufw allow 'Nginx Full'`.
5. **Run the script** (section above). Certbot obtains the certificate, adds the 443 server block, redirects HTTP to HTTPS, and sets HSTS.
6. **Renewal** is automatic (systemd timer `certbot.timer`). Check with `systemctl list-timers | grep certbot` and `sudo certbot renew --dry-run`.
7. **Update app URLs** in `/etc/carc/prod.env` to `https://example.com` (any `NEXT_PUBLIC_*` URLs; `SUCCESS_URL`/`CANCEL_URL` are not used by the code). After changing a `NEXT_PUBLIC_*` value, rebuild (`npm run build`) before restarting, switch the PayPal values to live (`NEXT_PUBLIC_PAYPAL_ENVIRONMENT`, `PAYPAL_BASE_URL=https://api-m.paypal.com` and live keys), use strong `ADMIN_DIAGNOSTIC_*` credentials, then `sudo systemctl restart carc-app@prod`.
8. **Verify**: `curl -I https://example.com` and `curl -I http://example.com` (expects a 301 to https).

Troubleshooting: certbot "challenge failed" means DNS isn't pointing at the server yet or port 80 is blocked. Use `CERTBOT_STAGING=1` while debugging. Check the nginx config with `sudo nginx -t` and logs in `/var/log/nginx/error.log`.
