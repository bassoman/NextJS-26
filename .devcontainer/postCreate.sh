#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "Installing npm workspaces (frontend, backend, backend_paypal)..."
npm install

echo "Installing Python support script dependencies (if any)..."
if [ -f PythonSupport/requirements.txt ]; then
  python3 -m pip install --user -r PythonSupport/requirements.txt
fi

echo "Done. Use 'npm run dev:all' to start frontend/backend/backend_paypal together,"
echo "or 'npm run dev:frontend' / 'dev:backend' / 'dev:backend_paypal' individually."
