# Admin DubFlow (Vite + React)

Painel administrativo em JavaScript (JS/JSX), atualizado para stack moderna.

## Requisitos

- Node `20+`
- npm `10+`

## Scripts

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Portas

- Dev server: `http://127.0.0.1:5174/admin/`
- Preview: `http://127.0.0.1:4174/admin/`

## Integração com o backend Laravel

- Build de produção em: `public/admin`
- Rota backend: `/admin`
- Em ambiente local, `/admin` redireciona para `ADMIN_FRONTEND_URL` (default `http://127.0.0.1:5174/admin`)
