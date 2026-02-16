#!/usr/bin/env sh
set -eu

REVERB_PORT="${REVERB_SERVER_PORT:-8081}"
REVERB_HOST="${REVERB_SERVER_HOST:-127.0.0.1}"

if command -v ss >/dev/null 2>&1 && ss -ltn | grep -q ":${REVERB_PORT} "; then
  echo "[reverb] porta ${REVERB_PORT} ja esta em uso, mantendo websocket ja ativo."
  while true; do
    sleep 3600
  done
else
  exec php artisan reverb:start --host="${REVERB_HOST}" --port="${REVERB_PORT}"
fi
