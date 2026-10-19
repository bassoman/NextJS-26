# CARC Website

Baseline configuration for the CARC website. This project is deployed as a
native Node.js/Next.js application on Ubuntu; Docker and Docker Compose are not
part of the deployment process.

## Host deployment layout

The deployment scripts and systemd units use these defaults:

| Purpose | Production | Sandbox |
| --- | --- | --- |
| SQLite database | `/var/carc/prod/data/carc.db` | `/var/carc/sandbox/data/carc.db` |
| SSM environment file | `/etc/carc/prod.env` | `/etc/carc/sandbox.env` |
| App listen port | `3000` | `3001` |
| Hourly backup directory | `/var/carc/prod/backups/hourly` | `/var/carc/sandbox/backups/hourly` |

The database paths are supplied to the app as `SQLITE_DATABASE_PATH`. The
database and backup directories must be writable by the `ubuntu` service user.
The SSM sync script writes environment files with mode `600`; run it with
`sudo` so root owns the file and only the system service manager can read it.

## Initial host setup

Install Node.js/npm, AWS CLI, and `sqlite3` on the Ubuntu host. From the project
root, create the persistent directories and grant access to the app user:

```bash
sudo mkdir -p \
  /etc/carc \
  /var/carc/prod/data /var/carc/prod/backups/hourly \
  /var/carc/sandbox/data /var/carc/sandbox/backups/hourly
sudo chown -R ubuntu:ubuntu /var/carc
sudo chmod 750 /var/carc/prod/data /var/carc/prod/backups/hourly
sudo chmod 750 /var/carc/sandbox/data /var/carc/sandbox/backups/hourly
```

Install dependencies and build the frontend using the normal project commands:

```bash
npm ci
npm run build
```

The PayPal client ID is read at runtime from `PAYPAL_CLIENT_ID` by the
server-rendered checkout page, so one build serves both production and sandbox;
switching PayPal environments only needs updated parameters and a restart.
Do not place a `frontend/.env.local` file on the host, because Next.js would
load it as a fallback.

## AWS Systems Manager Parameter Store

Store app configuration under `/carc/prod/` and `/carc/sandbox/`. Provide the
PayPal server credentials and API URL (`PAYPAL_CLIENT_ID`,
`PAYPAL_CLIENT_SECRET`, and `PAYPAL_BASE_URL`), plus any other runtime settings
the app requires. Use the corresponding live or sandbox PayPal credentials and
API URL (`https://api-m.paypal.com` for live,
`https://api-m.sandbox.paypal.com` for sandbox); all three must match.

Attach an IAM policy to the host's AWS identity that permits
`ssm:GetParametersByPath` for the relevant `/carc/*` parameters. The AWS CLI
must be configured with the intended region and credentials. The sync script
defaults to `us-west-2`; override `AWS_REGION` if the parameters are elsewhere.
If SecureString parameters use a customer-managed KMS key, the host identity
also needs permission to decrypt with that key.

Fetch the selected environment's parameters from the project root:

```bash
sudo -E CARC_ENVIRONMENT=prod ./deployment/scripts/fetch-ssm-params.sh
sudo -E CARC_ENVIRONMENT=sandbox ./deployment/scripts/fetch-ssm-params.sh
```

The script writes `/etc/carc/{prod|sandbox}.env` atomically with mode `600`.
It sets the host database path and port itself, rather than accepting
container-specific `SQLITE_DATABASE_PATH` or `PORT` values from SSM:
production uses `/var/carc/prod/data/carc.db` and port `3000`; sandbox uses
`/var/carc/sandbox/data/carc.db` and port `3001`.

Parameter names below each environment path must be simple environment-variable
names (for example, `PAYPAL_CLIENT_SECRET`); nested SSM keys with the same final
name are not supported. Do not store `CARC_CLEAR_TRANSACTIONS` in SSM.

## Initializing SQLite databases

If production and sandbox databases need to be seeded from the checked-out
`frontend/data/carc.db`, run the initializer once from the project root as
root:

```bash
sudo ./deployment/scripts/initialize-databases.sh
```

It creates either target only when the database and its SQLite sidecar files
do not already exist, assigns ownership to `ubuntu:ubuntu`, and uses mode `660`
for the database and `750` for its data directory. It intentionally refuses to
replace an existing database. To use a different source file, set
`CARC_SOURCE_DB`; target paths can be overridden with `CARC_PROD_DB` and
`CARC_SANDBOX_DB`.

## Running the app with systemd

The `carc-app@.service` template runs the built Next.js app as the `ubuntu`
user, loads the selected environment file, and restarts after failures. Install
the unit and start the desired environment:

```bash
sudo cp deployment/systemd/carc-app@.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now carc-app@prod.service
```

Use `carc-app@sandbox.service` to run the sandbox instance instead. Both
instances can run from the same checkout/build, since PayPal settings are read
from each instance's environment file at runtime. Configure the host reverse
proxy to route to production port `3000` and sandbox port `3001`. After
refreshing SSM values or deploying a new build,
restart the affected service:

```bash
sudo systemctl restart carc-app@prod.service
sudo systemctl status carc-app@prod.service
```

View logs with `journalctl -u carc-app@prod.service`. The service requires a
build at `frontend/.next` and an initialized database at the path in its
environment file.

## SQLite backups

The existing hourly systemd backup timer backs up production. The backup script
uses `SQLITE_DATABASE_PATH` from `/etc/carc/prod.env` and writes timestamped,
integrity-checked backups with SHA-256 checksums under
`/var/carc/prod/backups/hourly`. Backups older than 48 hours are removed by
default. The existing units can be installed/enabled with:

```bash
sudo cp deployment/systemd/carc-backup.service deployment/systemd/carc-backup.timer \
  /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now carc-backup.timer
```

The backup service runs as `ubuntu`; ensure the database and backup directories
are accessible to that user. To change retention, set `CARC_RETENTION_MINUTES`.
The backup script also supports `CARC_ENVIRONMENT`, `CARC_DB_FILE`, and
`CARC_BACKUP_DIR` overrides. Configure a separate timer/service before relying
on automatic sandbox backups.

## Clearing PayPal transactions

The former container entrypoint's optional database deletion is an explicit
maintenance command now. Stop the selected app first, then run the clear script
with both an environment argument and an opt-in variable:

```bash
sudo systemctl stop carc-app@prod.service
sudo env CARC_CLEAR_TRANSACTIONS=1 \
  ./deployment/scripts/clear-paypal-transactions.sh prod
sudo systemctl start carc-app@prod.service
```

Use `sandbox` in place of `prod` to target sandbox. The script deletes all rows
from `pp_tnx` and vacuums the selected database. Confirm the environment and
database path carefully before running it.
