#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is required to build frontend assets on Vercel." >&2
  exit 1
fi

npm --prefix "$ROOT_DIR/frontend" ci
bash "$ROOT_DIR/scripts/build_frontend.sh"

