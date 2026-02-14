#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/var/www/dubflow}"
PHP_BIN="${PHP_BIN:-php}"
COMPOSER_BIN="${COMPOSER_BIN:-composer}"

cd "$APP_DIR"

echo "[backend] Syncing repository"
git fetch --all --prune
git checkout "${DEPLOY_REF:-main}"
git pull --ff-only origin "${DEPLOY_REF:-main}"

echo "[backend] Installing dependencies"
$COMPOSER_BIN install --no-dev --prefer-dist --no-interaction --optimize-autoloader

echo "[backend] Running migrations"
$PHP_BIN artisan migrate --force

echo "[backend] Caching framework artifacts"
$PHP_BIN artisan config:clear
$PHP_BIN artisan cache:clear
$PHP_BIN artisan config:cache
$PHP_BIN artisan route:cache
$PHP_BIN artisan view:cache

echo "[backend] Restarting queues"
$PHP_BIN artisan queue:restart || true

echo "[backend] Health checks"
$PHP_BIN artisan about --only=environment
$PHP_BIN artisan optimize

echo "[backend] Deployment completed"

