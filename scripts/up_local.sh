#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-8000}"

STRICT_ENV=1
RELOAD=1

usage() {
  cat <<'EOF'
Usage: bash scripts/up_local.sh [options]

One-command local startup:
- installs backend/frontend dependencies
- builds frontend assets
- validates environment
- starts FastAPI (serving frontend from /static and /)

Options:
  --no-strict-env  Allow missing/placeholder AEMET_API_KEY
  --no-reload      Disable uvicorn reload mode
  --host HOST      Bind host (default: 127.0.0.1)
  --port PORT      Bind port (default: 8000)
  -h, --help       Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-strict-env)
      STRICT_ENV=0
      shift
      ;;
    --no-reload)
      RELOAD=0
      shift
      ;;
    --host)
      HOST="$2"
      shift 2
      ;;
    --port)
      PORT="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

cd "$ROOT_DIR"

if [[ "$STRICT_ENV" -eq 1 ]]; then
  bash scripts/setup.sh --strict-env
else
  bash scripts/setup.sh
fi

START_ARGS=(--host "$HOST" --port "$PORT")
if [[ "$STRICT_ENV" -eq 1 ]]; then
  START_ARGS+=(--strict-env)
fi
if [[ "$RELOAD" -eq 1 ]]; then
  START_ARGS+=(--reload)
fi

exec bash scripts/start.sh "${START_ARGS[@]}"
