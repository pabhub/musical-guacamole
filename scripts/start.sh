#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
VENV_DIR="$ROOT_DIR/.venv"

STRICT_ENV=0
RELOAD=0
HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-8000}"

usage() {
  cat <<'EOF'
Usage: bash scripts/start.sh [options]

Options:
  --strict-env  Fail if .env or AEMET_API_KEY is missing
  --reload      Run uvicorn with --reload (development)
  --host HOST   Bind host (default: 0.0.0.0)
  --port PORT   Bind port (default: 8000)
  -h, --help    Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --strict-env)
      STRICT_ENV=1
      shift
      ;;
    --reload)
      RELOAD=1
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

if [[ ! -d "$VENV_DIR" ]]; then
  echo "Error: .venv not found. Run: bash scripts/setup.sh" >&2
  exit 1
fi

if [[ "$STRICT_ENV" -eq 1 ]]; then
  if [[ ! -f "$ENV_FILE" ]]; then
    echo "Error: .env file is missing. Copy .env.example to .env and set AEMET_API_KEY." >&2
    exit 1
  fi
  key="$(grep -E '^[[:space:]]*AEMET_API_KEY[[:space:]]*=' "$ENV_FILE" | tail -n 1 | cut -d= -f2- | tr -d '[:space:]' || true)"
  if [[ -z "${key:-}" || "$key" == "your_aemet_api_key_here" ]]; then
    echo "Error: AEMET_API_KEY is missing/placeholder in .env." >&2
    exit 1
  fi
fi

# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"
cd "$ROOT_DIR"

if [[ "$RELOAD" -eq 1 ]]; then
  exec uvicorn app.main:app --host "$HOST" --port "$PORT" --reload
else
  exec uvicorn app.main:app --host "$HOST" --port "$PORT"
fi
