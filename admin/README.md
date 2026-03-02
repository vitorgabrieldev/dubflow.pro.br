# Admin DubFlow (Legacy App Migrado para Vite)

Este diretório mantém o painel administrativo legado (com login e rotas existentes),
agora compilado e servido com Vite.

## Stack

- React 18 (JS/JSX)
- React Router 5
- Redux + Redux Persist
- Ant Design 4
- Vite 7

## Scripts

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Endpoints locais

- Dev server: `http://127.0.0.1:5174/admin/`
- Backend Laravel: `http://127.0.0.1:8000/admin`

## Integração com Laravel

- Build gera arquivos em `public/admin`.
- Em `APP_ENV=local`, a rota `/admin` redireciona para `ADMIN_FRONTEND_URL`.
