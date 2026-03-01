#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/var/www/dubflow}"
PHP_BIN="${PHP_BIN:-php}"
COMPOSER_BIN="${COMPOSER_BIN:-composer}"
REPO_REMOTE="${REPO_REMOTE:-origin}"
DEPLOY_REF="${DEPLOY_REF:-main}"
QUEUE_SERVICE="${QUEUE_SERVICE:-dubflow-queue}"
REVERB_SERVICE="${REVERB_SERVICE:-dubflow-reverb}"
BACKEND_SERVICE="${BACKEND_SERVICE:-}"
RUN_BACKEND_TESTS="${RUN_BACKEND_TESTS:-0}"
RUN_MIGRATIONS="${RUN_MIGRATIONS:-1}"

run_systemctl() {
  if command -v sudo >/dev/null 2>&1 && sudo -n true >/dev/null 2>&1; then
    sudo -n systemctl "$@"
  else
    systemctl "$@"
  fi
}

restart_service_if_available() {
  local service="$1"

  if [[ -z "$service" ]]; then
    return 0
  fi

  if ! command -v systemctl >/dev/null 2>&1; then
    echo "[backend] systemctl indisponivel, pulando restart de '$service'"
    return 0
  fi

  if ! run_systemctl list-unit-files --type=service --no-legend "${service}.service" 2>/dev/null | grep -q "^${service}\\.service"; then
    echo "[backend] Servico '$service' nao encontrado, pulando"
    return 0
  fi

  echo "[backend] Restarting service '$service'"
  run_systemctl restart "$service"
  run_systemctl is-active --quiet "$service"
}

cd "$APP_DIR"

echo "[backend] Syncing repository"
git fetch --all --tags --prune
git checkout "$DEPLOY_REF"
if git ls-remote --exit-code --heads "$REPO_REMOTE" "$DEPLOY_REF" >/dev/null 2>&1; then
  git pull --ff-only "$REPO_REMOTE" "$DEPLOY_REF"
else
  echo "[backend] '$DEPLOY_REF' nao e branch remota; seguindo sem git pull"
fi

if [[ "$RUN_BACKEND_TESTS" == "1" ]]; then
  echo "[backend] Running backend tests (RUN_BACKEND_TESTS=1)"
  $COMPOSER_BIN install --prefer-dist --no-interaction
  $PHP_BIN artisan test
fi

echo "[backend] Installing dependencies"
$COMPOSER_BIN install --no-dev --prefer-dist --no-interaction --optimize-autoloader

if [[ "$RUN_MIGRATIONS" == "1" ]]; then
  echo "[backend] Running migrations"
  $PHP_BIN artisan migrate --force
fi

echo "[backend] Ensuring public storage symlink"
$PHP_BIN artisan storage:link || true

echo "[backend] Caching framework artifacts"
$PHP_BIN artisan optimize:clear
$PHP_BIN artisan optimize
$PHP_BIN artisan event:cache

echo "[backend] Restarting queues"
$PHP_BIN artisan queue:restart || true
$PHP_BIN artisan reverb:restart || true

restart_service_if_available "$QUEUE_SERVICE"
restart_service_if_available "$REVERB_SERVICE"
restart_service_if_available "$BACKEND_SERVICE"

echo "[backend] Health checks"
$PHP_BIN artisan about --only=environment

echo "[backend] Deployment completed"
