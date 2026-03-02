# Documentação técnica da aplicação

Guia técnico central do DubFlow.

- Repositório oficial: [vitorgabrieldev/dubflow.pro.br](https://github.com/vitorgabrieldev/dubflow.pro.br)
- Visão de Produto: [`../README.md`](../README.md)

## Índice técnico

- Arquitetura: [`ARCHITECTURE.md`](ARCHITECTURE.md)
- Banco de dados: [`DATABASE.md`](DATABASE.md)
- Segurança: [`SECURITY.md`](SECURITY.md)
- Testes: [`TESTING.md`](TESTING.md)
- Matriz de cobertura: [`TEST_MATRIX.md`](TEST_MATRIX.md)
- Deploy geral: [`DEPLOYMENT.md`](DEPLOYMENT.md)
- Produção em DigitalOcean: [`PRODUCTION_DIGITALOCEAN.md`](PRODUCTION_DIGITALOCEAN.md)
- Docker e Render: [`DOCKER_RENDER.md`](DOCKER_RENDER.md)
- Roadmap funcional: [`DUBBING_ROADMAP.md`](DUBBING_ROADMAP.md)
- Backlog de evolução: [`AJUSTES.md`](AJUSTES.md)
- Planejamento de assinaturas: [`ASSINATURAS.md`](ASSINATURAS.md)

## Stack da aplicação

- Backend: Laravel 12 + JWT (`php-open-source-saver/jwt-auth`)
- Frontend: Next.js (App Router)
- Interface: Tailwind CSS + componentes reutilizáveis
- Idiomas: `pt-BR` (padrão), `en`, `es`, `ja`, `fr`

## Execução local (resumo)

Pré-requisitos:

- PHP `8.3+`
- Composer `2+`
- Node `22+`
- npm `10+`
- Banco SQL (SQLite/MySQL/PostgreSQL)

Comandos:

```bash
composer install
npm install
npm --prefix frontend install
cp .env.example .env
php artisan key:generate
php artisan jwt:secret --force
php artisan storage:link
php artisan migrate
php artisan db:seed
composer run dev
```

Padrão local oficial:

- API: `http://127.0.0.1:8000`
- Frontend: `http://localhost:3000`

Validação completa:

```bash
./scripts/test-all-local.sh
```
