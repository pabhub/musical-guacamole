#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
DIST_DIR="$FRONTEND_DIR/dist"

mkdir -p "$DIST_DIR"

cd "$FRONTEND_DIR"
if command -v npx >/dev/null 2>&1; then
  npx tsc --project tsconfig.json
elif command -v tsc >/dev/null 2>&1; then
  tsc --project tsconfig.json
else
  echo "Error: TypeScript compiler not found. Run 'npm install --prefix frontend' first." >&2
  exit 1
fi
cp "$FRONTEND_DIR/src/index.html" "$DIST_DIR/index.html"
cp "$FRONTEND_DIR/src/config.html" "$DIST_DIR/config.html"
cp "$FRONTEND_DIR/src/style.css" "$DIST_DIR/style.css"
