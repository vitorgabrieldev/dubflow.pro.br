# Arquitetura do DubFlow

## Visão Geral
- `backend`: Laravel 12, API REST em `/api/v1`.
- `frontend`: Next.js App Router com rotas de página e rotas proxy em `/api/*`.
- autenticação: JWT (`ed_token`) em cookie `httpOnly`.
- domínio central: `Organization -> Playlist -> Season -> Post`.

## Backend por Camadas
- `Controllers` (`app/Http/Controllers/Api/V1`): orquestram requests e responses.
- `Models` (`app/Models`): regras de persistência e relacionamentos.
- `Support` (`app/Support/OrganizationAccess.php`): políticas de autorização de domínio.
- `Notifications`: eventos de domínio enviados para central de notificações.
- `Middleware`:
  - `RequestContextMiddleware`: request-id e logs estruturados por request.
  - `SecurityHeadersMiddleware`: headers de segurança.

## Frontend por Camadas
- `app/[locale]/*`: páginas e layouts.
- `components/*`: blocos reutilizáveis (feed, comunidade, publicar, auth, ui).
- `app/api/*`: proxy server-side para API Laravel, com refresh de token em fluxos críticos.
- `lib/*`: i18n, helpers e cliente de API.

## Princípios Técnicos
- formulários com feedback visual (`FormSubmitButton`, loaders e estados de erro/sucesso).
- carregamento incremental por scroll para feed/comunidades/playlists.
- restrições de domínio no backend (ex.: profundidade máxima de comentários em 2 níveis).
- logs estruturados para observabilidade e auditoria.
- cache de leitura de curta duração (20s) em listagens de feed, comunidades e playlists para reduzir latência.

## Roadmap Técnico Recomendado
- storage/streaming: S3 + HLS + CDN.
- busca: Meilisearch/OpenSearch para escala.
- realtime: WebSocket/SSE para notificações e presença.
- segurança avançada: 2FA, rotação de refresh token, políticas de sessão.
