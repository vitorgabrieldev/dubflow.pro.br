#!/usr/bin/env sh
set -eu

APP_DIR="${APP_DIR:-/var/www/app}"
PORT="${PORT:-8000}"
RUN_MIGRATIONS="${RUN_MIGRATIONS:-true}"
MIGRATION_MAX_ATTEMPTS="${MIGRATION_MAX_ATTEMPTS:-20}"
MIGRATION_RETRY_SLEEP="${MIGRATION_RETRY_SLEEP:-3}"

cd "${APP_DIR}"

if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
fi

mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views bootstrap/cache

php artisan storage:link >/dev/null 2>&1 || true

if [ "${RUN_MIGRATIONS}" = "true" ]; then
  ATTEMPT=1
  until [ "$ATTEMPT" -gt "${MIGRATION_MAX_ATTEMPTS}" ]; do
    if php artisan migrate --force; then
      break
    fi

    echo "[entrypoint] migration attempt ${ATTEMPT}/${MIGRATION_MAX_ATTEMPTS} failed, retrying in ${MIGRATION_RETRY_SLEEP}s..."
    ATTEMPT=$((ATTEMPT + 1))
    sleep "${MIGRATION_RETRY_SLEEP}"
  done

  if [ "$ATTEMPT" -gt "${MIGRATION_MAX_ATTEMPTS}" ]; then
    echo "[entrypoint] migrations failed after ${MIGRATION_MAX_ATTEMPTS} attempts"
    exit 1
  fi
fi

php artisan config:clear >/dev/null 2>&1 || true
php artisan route:clear >/dev/null 2>&1 || true
php artisan view:clear >/dev/null 2>&1 || true
php artisan cache:clear >/dev/null 2>&1 || true

php artisan config:cache >/dev/null 2>&1 || true
php artisan route:cache >/dev/null 2>&1 || true
php artisan view:cache >/dev/null 2>&1 || true

if [ "$#" -gt 0 ]; then
  exec "$@"
fi

exec php -d variables_order=EGPCS artisan serve --host=0.0.0.0 --port="${PORT}"
