#!/usr/bin/env bash
set -Eeuo pipefail

REPO_DIR="${REPO_DIR:-/var/www/dubflow}"
FRONTEND_DIR="${FRONTEND_DIR:-$REPO_DIR/frontend}"
NODE_BIN="${NODE_BIN:-node}"
NPM_BIN="${NPM_BIN:-npm}"
PM2_APP="${PM2_APP:-dubflow-frontend}"
REPO_REMOTE="${REPO_REMOTE:-origin}"
DEPLOY_REF="${DEPLOY_REF:-main}"
FRONTEND_SERVICE="${FRONTEND_SERVICE:-dubflow-next}"
SKIP_GIT_SYNC="${SKIP_GIT_SYNC:-0}"

run_systemctl() {
  if command -v sudo >/dev/null 2>&1 && sudo -n true >/dev/null 2>&1; then
    sudo -n systemctl "$@"
  else
    systemctl "$@"
  fi
}

cd "$REPO_DIR"

if [[ "$SKIP_GIT_SYNC" != "1" ]]; then
  echo "[frontend] Syncing repository"
  git fetch --all --tags --prune
  git checkout "$DEPLOY_REF"
  if git ls-remote --exit-code --heads "$REPO_REMOTE" "$DEPLOY_REF" >/dev/null 2>&1; then
    git pull --ff-only "$REPO_REMOTE" "$DEPLOY_REF"
  else
    echo "[frontend] '$DEPLOY_REF' nao e branch remota; seguindo sem git pull"
  fi
fi

cd "$FRONTEND_DIR"

echo "[frontend] Preparing build directory"
if [[ -d ".next" ]]; then
  if ! rm -rf ".next" 2>/dev/null; then
    echo "[frontend] .next possui arquivos sem permissao de escrita para '$USER'."
    if command -v sudo >/dev/null 2>&1 && sudo -n true >/dev/null 2>&1; then
      echo "[frontend] Removendo .next com sudo -n"
      sudo -n rm -rf ".next"
    else
      echo "[frontend] Erro: nao foi possivel remover .next sem sudo nao-interativo."
      echo "[frontend] Execute manualmente: sudo rm -rf \"$FRONTEND_DIR/.next\" && sudo chown -R $(id -un):$(id -gn) \"$FRONTEND_DIR\""
      exit 1
    fi
  fi
fi

echo "[frontend] Runtime details"
$NODE_BIN -v

echo "[frontend] Installing dependencies"
$NPM_BIN ci

echo "[frontend] Building application"
$NPM_BIN run build

echo "[frontend] Restarting process"
if command -v systemctl >/dev/null 2>&1 && run_systemctl list-unit-files --type=service --no-legend "${FRONTEND_SERVICE}.service" 2>/dev/null | grep -q "^${FRONTEND_SERVICE}\\.service"; then
  echo "[frontend] Restarting systemd service '$FRONTEND_SERVICE'"
  run_systemctl restart "$FRONTEND_SERVICE"
  run_systemctl is-active --quiet "$FRONTEND_SERVICE"
elif command -v pm2 >/dev/null 2>&1; then
  echo "[frontend] systemd service indisponivel; usando PM2 app '$PM2_APP'"
  pm2 describe "$PM2_APP" >/dev/null 2>&1 && pm2 reload "$PM2_APP" || pm2 start "$NPM_BIN -- start" --name "$PM2_APP"
else
  echo "[frontend] Erro: nem systemd ('$FRONTEND_SERVICE') nem pm2 ('$PM2_APP') estao disponiveis."
  exit 1
fi

echo "[frontend] Deployment completed"
