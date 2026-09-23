#!/usr/bin/env bash
# Single entry point for the RLS E2E suite (Robot Framework + robotframework-browser).
#
#   bun run e2e          # setup(if needed) -> seed DB -> serve backend -> robot -> teardown
#   bun run e2e:install  # = run.sh --setup  -> only venv + Python/browser tooling
#
# Env overrides: RLS_TEST_PORT (3001), BIND_ADDRESS (127.0.0.1), DB_PATH (auto temp).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

PORT="${RLS_TEST_PORT:-3001}"
BIND_ADDRESS="${BIND_ADDRESS:-127.0.0.1}"
DB_PATH="${DB_PATH:-$(mktemp -u "/tmp/rls_e2e_${PORT}_XXXXXX.db")}"
export PORT BIND_ADDRESS DB_PATH

VENV="$SCRIPT_DIR/.venv"
MARKER="$VENV/.rfbrowser-ready"

# ── Python venv + robotframework-browser + Chromium (idempotent) ──────────────
setup_env() {
  command -v python3 >/dev/null || { echo ">> ERROR: python3 required" >&2; exit 1; }
  command -v node   >/dev/null || { echo ">> ERROR: node required (robotframework-browser)" >&2; exit 1; }
  command -v bun    >/dev/null || { echo ">> ERROR: bun required (serve test backend)" >&2; exit 1; }

  [ -x "$VENV/bin/python" ] || { echo ">> Creating Python venv …"; python3 -m venv "$VENV"; }
  "$VENV/bin/python" -m pip install -q --upgrade pip
  "$VENV/bin/python" -m pip install -q "robotframework>=7.0" "robotframework-browser>=18.0"

  if [ -f "$MARKER" ]; then
    echo ">> robotframework-browser tooling already installed (skip init/download)"
    return 0
  fi
  echo ">> Initializing robotframework-browser (Node wrapper) …"
  "$VENV/bin/rfbrowser" init
  echo ">> Installing Playwright Chromium …"
  if "$VENV/bin/rfbrowser" install chromium; then
    : > "$MARKER"
  else
    echo ">> WARNING: chromium install failed; Browser tests may skip" >&2
  fi
}

if [ "${1:-}" = "--setup" ]; then
  setup_env
  echo ">> E2E tooling ready"
  exit 0
fi

# ── Full run ─────────────────────────────────────────────────────────────────
echo ">> E2E target: http://${BIND_ADDRESS}:${PORT}  |  DB: ${DB_PATH}"
setup_env

# server.ts seeds the schema + test user (operator_1/securePassword123) on startup,
# then serves the Hono app via Bun.serve — no backend source changes required.
bun "$SCRIPT_DIR/server.ts" &
SRV_PID=$!
cleanup() {
  kill "$SRV_PID" 2>/dev/null || true
  wait "$SRV_PID" 2>/dev/null || true
  rm -f "$DB_PATH" "${DB_PATH}-wal" "${DB_PATH}-shm" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo ">> Waiting for backend …"
READY=0
for _ in $(seq 1 80); do
  if curl -sf "http://${BIND_ADDRESS}:${PORT}/health" >/dev/null 2>&1; then
    READY=1; break
  fi
  sleep 0.25
done
[ "$READY" = 1 ] || { echo ">> ERROR: backend did not start in time" >&2; exit 1; }
echo ">> Backend is up"

# ${BASE_URL} defaults in Resources/common.robot; -v overrides it for the suite.
echo ">> Running E2E tests …"
cd "$SCRIPT_DIR"
"$VENV/bin/python" -m robot \
  --outputdir results \
  --variable BASE_URL:"http://${BIND_ADDRESS}:${PORT}" \
  robot
cd "$ROOT"

echo ">> E2E done. Results: $SCRIPT_DIR/results"
