# Deploy Linux + GitHub Actions

## Guia Completo de Produção (Servidor Zerado)

- Sem Docker, com Apache + systemd + Next + Reverb:
  - `docs/PRODUCTION_DIGITALOCEAN.md`

## Workflows
- `ci.yml`: qualidade obrigatoria (backend + frontend + e2e).
- `security.yml`: auditoria de dependencias e CodeQL.
- `deploy.yml`: deploy manual com gates, delay e smoke test.

## Scripts de Deploy
- Backend: `deploy/backend.sh`
- Frontend: `deploy/frontend.sh`

## Segredos Necessarios (GitHub Environments)
- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_SSH_KEY`
- `REPO_DIR`
- `FRONTEND_DIR`
- `FRONTEND_PM2_APP`
- `SMOKE_HEALTH_URL`
- `SMOKE_FRONTEND_URL`

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

## Rollback
- Reexecutar `deploy.yml` apontando `deploy_ref` para commit/tag anterior.
