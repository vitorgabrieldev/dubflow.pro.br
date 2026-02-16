#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Ensure Node >= 22 for Next.js/Playwright local webServer.
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1090
  source "$HOME/.nvm/nvm.sh"
  if nvm ls 22 >/dev/null 2>&1; then
    nvm use 22 >/dev/null
  fi
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "$NODE_MAJOR" -lt 22 ]; then
  echo "Erro: Node >= 22 é obrigatório para rodar os testes locais (atual: $(node -v))."
  echo "Dica: nvm use 22"
  exit 1
fi

echo "[1/4] Backend (PHPUnit)"
if [ -f bootstrap/cache/config.php ]; then
  echo "Limpando config cache para proteger o banco principal..."
  php artisan config:clear >/dev/null
fi

APP_ENV=testing \
APP_CONFIG_CACHE=/tmp/dubflow-tests-config.php \
DB_CONNECTION=mysql \
DB_HOST=127.0.0.1 \
DB_PORT=3306 \
DB_DATABASE=studiodublagem_tests \
DB_USERNAME=projetos \
DB_PASSWORD= \
php vendor/bin/phpunit

echo "[2/4] Frontend TypeScript"
(
  cd frontend
  npx tsc --noEmit
)

echo "[3/4] Frontend lint"
(
  cd frontend
  npm run lint
)

echo "[4/4] Frontend E2E"
(
  cd frontend
  INTERNAL_API_URL="http://127.0.0.1:8000/api/v1" \
  NEXT_PUBLIC_API_URL="http://127.0.0.1:8000/api/v1" \
  npm run test:e2e
)

echo "Todos os testes passaram."
