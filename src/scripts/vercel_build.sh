#!/usr/bin/env bash
set -euo pipefail

SRC_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "$SRC_ROOT/.." && pwd)"

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is required to build frontend assets on Vercel." >&2
  exit 1
fi

npm --prefix "$REPO_ROOT/frontend" ci
bash "$REPO_ROOT/scripts/build_frontend.sh"

# Mirror built frontend into src/frontend/dist so deployments with Root Directory=src
# can include and serve the static bundle.
mkdir -p "$SRC_ROOT/frontend"
rm -rf "$SRC_ROOT/frontend/dist"
cp -R "$REPO_ROOT/frontend/dist" "$SRC_ROOT/frontend/dist"

