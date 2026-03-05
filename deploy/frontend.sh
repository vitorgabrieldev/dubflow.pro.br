#!/usr/bin/env bash
set -Eeuo pipefail

REPO_DIR="${REPO_DIR:-/var/www/dubflow}"
FRONTEND_DIR="${FRONTEND_DIR:-$REPO_DIR/frontend}"
ADMIN_DIR="${ADMIN_DIR:-$REPO_DIR/admin}"
NODE_BIN="${NODE_BIN:-node}"
NPM_BIN="${NPM_BIN:-npm}"
PM2_APP="${PM2_APP:-dubflow-frontend}"
REPO_REMOTE="${REPO_REMOTE:-origin}"
DEPLOY_REF="${DEPLOY_REF:-main}"
FRONTEND_SERVICE="${FRONTEND_SERVICE:-dubflow-next}"
SKIP_GIT_SYNC="${SKIP_GIT_SYNC:-0}"
RUN_ADMIN_BUILD="${RUN_ADMIN_BUILD:-1}"
NODE_BUILD_OPTIONS="${NODE_BUILD_OPTIONS:---max-old-space-size=1024}"

is_truthy() {
  local value="${1:-}"
  value="${value,,}"
  [[ "$value" == "1" || "$value" == "true" || "$value" == "yes" || "$value" == "on" ]]
}

apply_node_options() {
  local extra_options="${1:-}"
  if [[ -z "$extra_options" ]]; then
    return 0
  fi

  if [[ -n "${NODE_OPTIONS:-}" ]]; then
    export NODE_OPTIONS="${extra_options} ${NODE_OPTIONS}"
  else
    export NODE_OPTIONS="${extra_options}"
  fi
}

run_systemctl() {
  if command -v sudo >/dev/null 2>&1; then
    sudo -n /usr/bin/systemctl "$@"
  else
    /usr/bin/systemctl "$@"
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

echo "[frontend] Runtime details"
$NODE_BIN -v
apply_node_options "$NODE_BUILD_OPTIONS"

if is_truthy "$RUN_ADMIN_BUILD"; then
  if [[ ! -d "$ADMIN_DIR" ]]; then
    echo "[frontend] Erro: diretorio do admin nao encontrado em '$ADMIN_DIR'."
    exit 1
  fi

  echo "[frontend] Building admin assets"
  $NPM_BIN --prefix "$ADMIN_DIR" ci
  $NPM_BIN --prefix "$ADMIN_DIR" run build
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
      stale_dir=".next-stale-$(date +%s)"
      if mv ".next" "$stale_dir" 2>/dev/null; then
        echo "[frontend] .next foi movido para '$stale_dir' para evitar bloqueio de permissao."
      else
        echo "[frontend] Erro: nao foi possivel limpar ou mover .next sem sudo nao-interativo."
        echo "[frontend] Execute manualmente: sudo rm -rf \"$FRONTEND_DIR/.next\" && sudo chown -R $(id -un):$(id -gn) \"$FRONTEND_DIR\""
        exit 1
      fi
    fi
  fi
fi

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
