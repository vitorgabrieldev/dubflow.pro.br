# Documentacao Tecnica da aplicacao

Este guia concentra os pontos tecnicos de execucao, testes, deploy e manutencao do DubFlow.

## Mapa tecnico

- Arquitetura: [`ARCHITECTURE.md`](ARCHITECTURE.md)
- Banco de dados: [`DATABASE.md`](DATABASE.md)
- Seguranca: [`SECURITY.md`](SECURITY.md)
- Testes: [`TESTING.md`](TESTING.md)
- Matriz de cobertura: [`TEST_MATRIX.md`](TEST_MATRIX.md)
- Deploy geral: [`DEPLOYMENT.md`](DEPLOYMENT.md)
- Producao em DigitalOcean: [`PRODUCTION_DIGITALOCEAN.md`](PRODUCTION_DIGITALOCEAN.md)
- Docker Render: [`DOCKER_RENDER.md`](DOCKER_RENDER.md)
- Roadmap funcional: [`DUBBING_ROADMAP.md`](DUBBING_ROADMAP.md)
- Backlog de evolucao: [`AJUSTES.md`](AJUSTES.md)

## Stack da aplicacao

- Backend: Laravel 12 + JWT (`php-open-source-saver/jwt-auth`)
- Frontend: Next.js (App Router) + Turbopack
- UI: Tailwind CSS + componentes reutilizaveis
- Idiomas do frontend: `pt-BR` (padrao), `en`, `es`, `ja`, `fr`

## Estrutura principal

- API Laravel: `routes/api.php`
- Controllers API: `app/Http/Controllers/Api/V1`
- Modelos: `app/Models`
- Regras de acesso por organizacao: `app/Support/OrganizationAccess.php`
- Frontend Next: `frontend/`

## Requisitos locais

- PHP `8.3+`
- Composer `2+`
- Node `22+` (recomendado)
- NPM `10+`
- Banco SQL (SQLite/MySQL/PostgreSQL)

## Setup local

1. Ativar Node 22:

```bash
nvm use 22
# opcional: tornar padrao local
nvm alias default 22
```

2. Instalar dependencias PHP:

```bash
composer install
```

3. Instalar dependencias JS:

```bash
npm install
npm --prefix frontend install
```

4. Preparar ambiente:

```bash
cp .env.example .env
php artisan key:generate
php artisan jwt:secret --force
php artisan storage:link
```

5. Configurar banco no `.env` e rodar migrations:

```bash
php artisan migrate
php artisan db:seed
```

6. Subir aplicacao local:

```bash
composer run dev
```

- API Laravel: `http://localhost:8000`
- Frontend Next: `http://localhost:3000`
- Reverb: `ws://127.0.0.1:8080`

## Padrao local oficial (sem Docker)

- API em `http://127.0.0.1:8000`
- Frontend em `http://localhost:3000`

Validacao completa local:

```bash
./scripts/test-all-local.sh
```

Esse comando executa:

- backend (`phpunit`)
- frontend (`tsc --noEmit` e `eslint`)
- e2e (`playwright`)

## Docker (API + Frontend)

```bash
docker compose up -d
```

- API: `http://localhost:3030`
- Frontend: `http://localhost:3031`

## Dados demo

O seeder `DemoPortfolioSeeder` cria:

- 30 usuarios demo
- 8 comunidades
- dezenas de playlists
- 50+ posts
- curtidas, comentarios, visualizacoes e colaboracoes

Credencial demo principal:

- Email: `admin@dubflow.dev`
- Senha: `password123`

## Endpoints principais da API

Prefixo: `/api/v1`

- Auth: `register`, `login`, `refresh`, `logout`, `me`
- Organizacoes: listagem, detalhe, criacao, atualizacao e follow/unfollow
- Membros: listagem, convite e fluxo de aceite/rejeicao
- Playlists: listagem e criacao por organizacao
- Posts: feed, detalhe, criacao, atualizacao e exclusao
- Interacoes: likes, comentarios e views
- Notificacoes: listagem e marcacao de leitura
- Chat: conversas, mensagens e bloqueio de usuario
- Busca e dashboard: busca global e resumo operacional
