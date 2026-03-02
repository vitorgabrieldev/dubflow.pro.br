# DubFlow Frontend

Aplicação frontend do DubFlow (Next.js App Router).

## Versão

- `1.0.0` (primeira versão estável)
- Arquivos de versão: `VERSION` e `CHANGELOG.md`

## Padrão local oficial

- Frontend: `http://localhost:3000`
- API (backend Laravel): `http://127.0.0.1:8000/api/v1`

## Requisitos

- Node `22+`
- npm `10+`

## Configuração

```bash
nvm use 22
npm install
```

Crie o arquivo `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1
INTERNAL_API_URL=http://127.0.0.1:8000/api/v1
```

Execução local:

```bash
npm run dev
```

## Testes

- TypeScript: `npx tsc --noEmit`
- Lint: `npm run lint`
- E2E: `npm run test:e2e`

Validação completa da aplicação (backend + frontend + e2e) na raiz:

```bash
./scripts/test-all-local.sh
```
