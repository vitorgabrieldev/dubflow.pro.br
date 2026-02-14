#!/usr/bin/env bash
set -Eeuo pipefail

REPO_DIR="${REPO_DIR:-/var/www/dubflow}"
FRONTEND_DIR="${FRONTEND_DIR:-$REPO_DIR/frontend}"
NODE_BIN="${NODE_BIN:-node}"
NPM_BIN="${NPM_BIN:-npm}"
PM2_APP="${PM2_APP:-dubflow-frontend}"

cd "$REPO_DIR"

echo "[frontend] Syncing repository"
git fetch --all --prune
git checkout "${DEPLOY_REF:-main}"
git pull --ff-only origin "${DEPLOY_REF:-main}"

cd "$FRONTEND_DIR"

echo "[frontend] Installing dependencies"
$NPM_BIN ci

echo "[frontend] Building application"
$NPM_BIN run build

echo "[frontend] Restarting process"
pm2 describe "$PM2_APP" >/dev/null 2>&1 && pm2 reload "$PM2_APP" || pm2 start "$NPM_BIN -- start" --name "$PM2_APP"

echo "[frontend] Deployment completed"
