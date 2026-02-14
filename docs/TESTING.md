# Testes do DubFlow

## Estrategia
- `Unit`: regras de dominio isoladas (ex.: permissoes de organizacao).
- `Feature`: contratos HTTP da API Laravel com validacao, autenticacao e persistencia.
- `E2E`: fluxo critico do frontend no navegador com Playwright.

## Requisitos Locais
- PHP 8.3+
- Extensao `pdo_sqlite` habilitada para suite em memoria
- Node 22+

## Comandos
```bash
# backend
php artisan test

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
- `could not find driver sqlite`: instalar `pdo_sqlite`.
- erro de Node: usar `nvm use 22`.

### Linux (pdo_sqlite)
```bash
# Ubuntu/Debian (PHP 8.3)
sudo apt update
sudo apt install -y php8.3-sqlite3

# Arch
sudo pacman -S php-sqlite
```

Depois:
```bash
php -m | grep -i sqlite
php artisan test
```
