# Docker + Render (API)

Este projeto agora possui Docker pronto para API Laravel em produção (Render) e ambiente local completo.

## Arquivos adicionados

- `Dockerfile`: imagem de produção da API.
- `docker/entrypoint.sh`: bootstrap do container (storage link, migrations, cache e start).
- `.dockerignore`: reduz contexto de build.
- `docker-compose.yml`: stack local (api + worker + mysql + redis).
- `render.yaml`: blueprint opcional para provisionar Web + Worker + DB no Render.

## Rodar local com Docker

1. Ajuste `APP_KEY` e `JWT_SECRET` no shell (ou em um arquivo `.env` exportado):

```bash
export APP_KEY='base64:SUA_CHAVE_AQUI'
export JWT_SECRET='SEU_SEGREDO_JWT_AQUI'
```

2. Suba os serviços:

```bash
docker compose up --build
```

3. API disponível em:

- `http://localhost:8000`
- healthcheck: `http://localhost:8000/up`

## Deploy no Render (via Docker)

Você pode:

- usar import manual do repo e selecionar `Dockerfile`, ou
- usar blueprint (`render.yaml`).

### Variáveis obrigatórias no serviço Web

- `APP_ENV=production`
- `APP_DEBUG=false`
- `APP_KEY` (obrigatória)
- `JWT_SECRET` (obrigatória)
- `APP_URL=https://SEU_BACKEND.render.com`
- `FRONTEND_URL=https://SEU_FRONT.vercel.app`
- `APP_FRONTEND_URL=https://SEU_FRONT.vercel.app`
- `DB_CONNECTION=mysql`
- `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` (do banco do Render)
- `RUN_MIGRATIONS=true`
- `PORT` (Render já injeta; mantenha padrão se quiser)

### Serviço Worker no Render

Crie um Worker com a mesma imagem e comando:

```bash
php artisan queue:work --sleep=1 --tries=3 --timeout=120
```

Com `RUN_MIGRATIONS=false` no Worker.

## Observações

- O container executa `php artisan migrate --force` no boot quando `RUN_MIGRATIONS=true`.
- O endpoint `/up` é usado para healthcheck.
- As rotas/caches são reconstruídas no startup para ambiente de produção.
