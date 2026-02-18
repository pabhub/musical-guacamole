#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
ENV_EXAMPLE="$ROOT_DIR/.env.example"
VENV_DIR="$ROOT_DIR/.venv"

INSTALL_BACKEND=1
INSTALL_FRONTEND=1
RUN_TESTS=0
STRICT_ENV=0

usage() {
  cat <<'EOF'
Usage: bash scripts/setup.sh [options]

Options:
  --backend-only   Install backend only
  --frontend-only  Install frontend only
  --run-tests      Run pytest after setup
  --strict-env     Fail if .env or AEMET_API_KEY is missing
  -h, --help       Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --backend-only)
      INSTALL_BACKEND=1
      INSTALL_FRONTEND=0
      shift
      ;;
    --frontend-only)
      INSTALL_BACKEND=0
      INSTALL_FRONTEND=1
      shift
      ;;
    --run-tests)
      RUN_TESTS=1
      shift
      ;;
    --strict-env)
      STRICT_ENV=1
      shift
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

check_command() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Error: required command '$cmd' is not available." >&2
    exit 1
  fi
}

ensure_env() {
  if [[ ! -f "$ENV_FILE" ]]; then
    if [[ "$STRICT_ENV" -eq 1 ]]; then
      echo "Error: .env file is missing. Copy .env.example to .env and set AEMET_API_KEY." >&2
      exit 1
    fi
    if [[ -f "$ENV_EXAMPLE" ]]; then
      cp "$ENV_EXAMPLE" "$ENV_FILE"
      echo "Warning: .env was missing. Created .env from .env.example. Update AEMET_API_KEY before real API calls."
    else
      echo "Warning: .env file is missing and .env.example was not found."
    fi
  fi

  if [[ -f "$ENV_FILE" ]]; then
    local key
    key="$(grep -E '^[[:space:]]*AEMET_API_KEY[[:space:]]*=' "$ENV_FILE" | tail -n 1 | cut -d= -f2- | tr -d '[:space:]' || true)"
    if [[ -z "${key:-}" || "$key" == "your_aemet_api_key_here" ]]; then
      if [[ "$STRICT_ENV" -eq 1 ]]; then
        echo "Error: AEMET_API_KEY is missing/placeholder in .env." >&2
        exit 1
      fi
      echo "Warning: AEMET_API_KEY is not set in .env. Live AEMET calls will fail."
    fi
  fi
}

if [[ "$INSTALL_BACKEND" -eq 1 ]]; then
  check_command python3
  ensure_env

  if [[ ! -d "$VENV_DIR" ]]; then
    python3 -m venv "$VENV_DIR"
  fi

  # shellcheck disable=SC1091
  source "$VENV_DIR/bin/activate"
  python -m pip install --upgrade pip
  pip install -e '.[dev]'
fi

if [[ "$INSTALL_FRONTEND" -eq 1 ]]; then
  check_command npm
  npm --prefix "$ROOT_DIR/frontend" install
  bash "$ROOT_DIR/scripts/build_frontend.sh"
fi

if [[ "$RUN_TESTS" -eq 1 ]]; then
  if [[ "$INSTALL_BACKEND" -eq 0 ]]; then
    if [[ -d "$VENV_DIR" ]]; then
      # shellcheck disable=SC1091
      source "$VENV_DIR/bin/activate"
    fi
  fi
  pytest -q
fi

echo "Setup complete."
