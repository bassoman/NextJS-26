#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "Installing npm workspaces (frontend, backend, backend_paypal)..."
npm install

echo "Ensuring better-sqlite3 13.0.3 is installed for the frontend..."
npm install --workspace=frontend --save-exact better-sqlite3@13.0.3

ENV_SOURCE="/workspace/env_vals/.env.local"
ENV_TARGET="/workspace/frontend/.env.local"
if [[ -f "$ENV_SOURCE" ]]; then
  install -m 600 "$ENV_SOURCE" "$ENV_TARGET"
  echo "Installed frontend environment values from the mounted env_vals directory."
else
  echo "ERROR: Expected environment file not found: $ENV_SOURCE" >&2
  exit 1
fi

echo "Installing Python support script dependencies (if any)..."
if [ -f PythonSupport/requirements.txt ]; then
  python3 -m pip install --user -r PythonSupport/requirements.txt
fi

echo "Done. Use 'npm run dev:all' to start frontend/backend/backend_paypal together,"
echo "or 'npm run dev:frontend' / 'dev:backend' / 'dev:backend_paypal' individually."
