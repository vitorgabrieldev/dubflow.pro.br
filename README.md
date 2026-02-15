# DubFlow

Sistema de portfolio para dublagens em formato de organizacoes/comunidades.

Cada organizacao pode:
- criar playlists (obra, temporada, episodios)
- publicar dublagens avulsas (sem playlist)
- creditar personagens e dubladores
- convidar colaboradores com fluxo de aceite antes da publicacao
- receber seguidores

## Stack

- Backend: Laravel 12 + JWT (`php-open-source-saver/jwt-auth`)
- Frontend: Next.js (App Router) + Turbopack
- UI: Tailwind CSS + componentes reutilizaveis
- Idiomas do frontend: `pt-BR` (padrao), `en`, `es`, `ja`, `fr`

## O que ja foi implementado

### Backend API

- Autenticacao JWT:
  - registro, login, refresh, perfil atual, logout
- Dominio principal:
  - organizacoes
  - membros por organizacao (owner/admin/editor/member)
  - playlists
  - posts de dublagem (audio/video)
  - colaboradores por post (pending/accepted/rejected)
  - creditos por personagem/dublador
  - likes, comentarios, follows
  - notificacoes internas (database)
  - metricas basicas (views)
- Busca global:
  - organizacoes, usuarios, playlists e posts
- Dashboard:
  - resumo de posts, views, likes, comentarios e convites pendentes

### Regras de negocio

- Post pode ser publicado fora de playlist
- Upload suporta audio e video
- Limite de arquivo: `800MB`
- Duracao maxima: `3600s` (1h)
- Aceite de colaboradores:
  - com colaborador pendente, `published_at` fica nulo
  - quando todos aceitam, post publica automaticamente
  - se alguem recusar, post volta para privado
- Verificacao automatica de organizacao:
  - `>10 playlists`
  - `>40 posts`
  - `>50 seguidores`
  - perfil completo (descricao, avatar e cover)

### Frontend

- App Next dentro de `frontend/`
- Homepage moderna e responsiva em `/{locale}`
- Cards reutilizaveis para feed e playlists
- Header com troca de idioma
- Base pronta para conectar com autenticacao JWT e telas de gestao

## Estrutura principal

- API Laravel: `routes/api.php`
- Controllers API: `app/Http/Controllers/Api/V1`
- Modelos: `app/Models`
- Regras de acesso por organizacao: `app/Support/OrganizationAccess.php`
- Frontend Next: `frontend/`
- Documentacao tecnica:
  - `docs/ARCHITECTURE.md`
  - `docs/DATABASE.md`
  - `docs/SECURITY.md`
  - `docs/TESTING.md`
  - `docs/DEPLOYMENT.md`
  - `docs/DUBBING_ROADMAP.md`

## Requisitos locais

- PHP `8.3+`
- Composer `2+`
- Node `22+` (recomendado)
- NPM `10+`
- Banco SQL (SQLite/MySQL/PostgreSQL)

## Versao atual

- Backend/API: `1.0.0`
- Frontend: `1.0.0`
- Status: primeira versao estavel

Arquivos de versao:
- raiz: `VERSION` e `CHANGELOG.md`
- frontend: `frontend/VERSION` e `frontend/CHANGELOG.md`

## Setup

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

6. Subir tudo com um comando:

```bash
composer run dev
```

- Laravel API: `http://localhost:8000`
- Next frontend: `http://localhost:3000` (redireciona automaticamente para `http://localhost:3000/pt-BR`)

## Padrao local oficial (sem Docker)

Para desenvolvimento e testes, o padrao oficial deste projeto e:
- API em `http://127.0.0.1:8000`
- Frontend em `http://localhost:3000`

Comando unico de validacao completa local:

```bash
./scripts/test-all-local.sh
```

Esse comando executa:
- backend (`phpunit`)
- frontend (`tsc --noEmit` e `eslint`)
- e2e (`playwright`)

## Docker (API + Frontend)

Com Docker Compose, basta subir:

```bash
docker compose up -d
```

- API: `http://localhost:3030`
- Frontend: `http://localhost:3031`

Obs.: no modo Docker, o frontend usa `INTERNAL_API_URL` para comunicação interna com a API e `NEXT_PUBLIC_API_URL` para chamadas do navegador.

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

## Observacao sobre banco

Se voce usar SQLite e receber erro de driver, instale a extensao `pdo_sqlite`.
Alternativamente, use MySQL/PostgreSQL no `.env`.

## Endpoints principais

Prefixo: `/api/v1`

- Auth:
  - `POST /auth/register`
  - `POST /auth/login`
  - `POST /auth/refresh`
  - `POST /auth/logout`
  - `GET /auth/me`
- Organizacoes:
  - `GET /organizations`
  - `POST /organizations`
  - `GET /organizations/{organization}`
  - `PATCH /organizations/{organization}`
  - `POST /organizations/{organization}/follow`
  - `DELETE /organizations/{organization}/follow`
- Membros:
  - `GET /organizations/{organization}/members`
  - `POST /organizations/{organization}/members`
  - `POST /organizations/{organization}/members/accept`
  - `POST /organizations/{organization}/members/reject`
- Playlists:
  - `GET /organizations/{organization}/playlists`
  - `POST /organizations/{organization}/playlists`
- Posts:
  - `GET /posts`
  - `GET /posts/{post}`
  - `POST /organizations/{organization}/posts`
  - `PATCH /posts/{post}`
  - `DELETE /posts/{post}`
- Interacoes:
  - `POST /posts/{post}/like`
  - `DELETE /posts/{post}/like`
  - `POST /posts/{post}/comments`
  - `POST /posts/{post}/view`
- Notificacoes:
  - `GET /notifications`
  - `POST /notifications/read-all`
  - `POST /notifications/{notificationId}/read`
  - `DELETE /notifications/clear`
- Busca e dashboard:
  - `GET /search?q=...`
  - `GET /dashboard/overview`

## Proximos passos recomendados

1. Adicionar painel administrativo de moderacao (reports, bloqueio, takedown)
2. Integrar login Google (Socialite)
3. Transcodificacao/validacao real de duracao com FFmpeg
4. Realtime para notificacoes
5. Politica completa de direitos autorais e termos de uso
6. Evoluir roadmap de dublagem em `docs/DUBBING_ROADMAP.md`
