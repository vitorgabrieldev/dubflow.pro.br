# Deploy Linux + GitHub Actions

## Guia Completo de Produção (Servidor Zerado)

- Sem Docker, com Apache + systemd + Next + Reverb:
  - `docs/PRODUCTION_DIGITALOCEAN.md`

## Workflows
- `ci.yml`: qualidade obrigatoria (backend + frontend + e2e).
- `security.yml`: auditoria de dependencias e CodeQL.
- `deploy.yml`: deploy manual com gates, delay e smoke test.
- `auto-deploy.yml`: dispara deploy automatico quando `CI` + `Security` passam na `main` (aguarda 1 minuto).

## Scripts de Deploy
- Backend: `deploy/backend.sh`
- Frontend: `deploy/frontend.sh`

## Segredos Necessarios (GitHub Environments)
- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_SSH_KEY` (recomendado) **ou** `DEPLOY_PASSWORD`
- `REPO_DIR`
- `FRONTEND_DIR` (ex.: `/var/www/dubflow/frontend`)
- `DEPLOY_GIT_REMOTE` (opcional, default: `origin`)
- `FRONTEND_SERVICE` (opcional, default: `dubflow-next`)
- `QUEUE_SERVICE` (opcional, default: `dubflow-queue`)
- `REVERB_SERVICE` (opcional, default: `dubflow-reverb`)
- `BACKEND_SERVICE` (opcional, se quiser reiniciar outro serviço backend)
- `FRONTEND_PM2_APP` (opcional; usado apenas se não houver service systemd)
- `SMOKE_HEALTH_URL`
- `SMOKE_FRONTEND_URL`

## Variaveis de Repositorio (opcional)
- `AUTO_DEPLOY_TARGET` (`production` por padrao; pode usar `staging`)

## Protecoes Recomendadas no GitHub
- Environments separados: `staging` e `production`.
- Required reviewers para `production`.
- Wait timer adicional no ambiente de `production`.
- Branch protection com status checks obrigatorios (`CI`, `Security`).
- Bloquear force push na branch principal.

## Fluxo
1. Rodar `workflow_dispatch` de `deploy.yml`.
2. Informar `deploy_ref` e `target`.
3. Pipeline executa:
   - quality gates
   - delay
   - deploy backend
   - delay
   - deploy frontend
   - smoke test

## Bootstrap Inicial do Servidor (obrigatorio 1x)
- O deploy remoto assume que `REPO_DIR` ja e um repositorio Git com os arquivos do projeto.
- Exemplo:
  - `mkdir -p /var/www/dubflow`
  - `git clone https://github.com/vitorgabrieldev/dubflow.pro.br.git /var/www/dubflow`

## Auto Deploy (main)
- O workflow `auto-deploy.yml` monitora conclusao dos workflows `CI` e `Security`.
- Quando ambos estao `success` para o mesmo commit na `main`, ele espera 60 segundos e dispara o `deploy.yml`.
- O disparo automatico usa:
  - `deploy_ref=<sha do commit>`
  - `target=AUTO_DEPLOY_TARGET` (ou `production` se nao configurado)
  - `skip_quality_gates=true` (evita rerodar toda a validacao)

## Rollback
- Reexecutar `deploy.yml` apontando `deploy_ref` para commit/tag anterior.
