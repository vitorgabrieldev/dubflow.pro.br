# Testes do DubFlow

## Estrategia
- `Unit`: regras de dominio isoladas (ex.: permissoes de organizacao).
- `Feature`: contratos HTTP da API Laravel com validacao, autenticacao e persistencia.
- `E2E`: fluxo critico do frontend no navegador com Playwright.

## Requisitos Locais
- PHP 8.3+
- Extensao `pdo_mysql` habilitada
- Banco MySQL de testes dedicado (`studiodublagem_tests`)
- Node 22+

## Comandos
```bash
# preparar banco de testes (migrate + seed)
php artisan migrate:fresh --seed --env=testing

# backend
php artisan test --env=testing

# frontend
cd frontend
npm run lint
npm run build
npm run test:e2e
```

## Cobertura
- CI executa testes backend com `--coverage-text`.
- Meta recomendada por modulo novo: >= 80%.
- Fluxos criticos devem ter teste de regressao antes do merge.

## CI
- Pipeline: `.github/workflows/ci.yml`
- Jobs:
  - backend tests
  - frontend lint + build
  - e2e smoke

## Diagnostico Rapido
- `could not find driver mysql`: instalar `pdo_mysql`.
- erro de Node: usar `nvm use 22`.

### Linux (pdo_mysql)
```bash
# Ubuntu/Debian (PHP 8.3)
sudo apt update
sudo apt install -y php8.3-mysql

# Arch
sudo pacman -S php
```

Depois:
```bash
php -m | grep -i pdo_mysql
php artisan test --env=testing
```
