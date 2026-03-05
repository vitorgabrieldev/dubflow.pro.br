# Test Matrix

Documento de cobertura automatizada real do projeto (`backend`, `frontend` e `admin`) com foco em regras de negócio e regressões funcionais.

## Suite Atual (Automatizada)

### Backend Unit (`tests/Unit`)
- `AchievementEngineTest.php`
- `ExampleTest.php`
- `OrganizationAccessTest.php`

### Backend Feature/API (`tests/Feature`)
- `AchievementApiTest.php`
- `AdminContentModulesApiTest.php`
- `AdminCoreApiTest.php`
- `AuthApiTest.php`
- `ChatApiTest.php`
- `DashboardApiTest.php`
- `DubbingTestApiTest.php`
- `ExampleTest.php`
- `MediaAccessApiTest.php`
- `NotificationApiTest.php`
- `OrganizationApiTest.php`
- `OrganizationInviteApiTest.php`
- `PlaylistApiTest.php`
- `PostPermissionMatrixApiTest.php`
- `PostPublishingApiTest.php`
- `UnifiedSearchApiTest.php`
- `UserProfileApiTest.php`

### Frontend E2E (`frontend/tests/e2e`)
- `account-community-post-lifecycle.spec.ts`
- `achievements-flow.spec.ts`
- `chat-flow.spec.ts` (inclui anexos de áudio inline no chat)
- `comments-notifications.spec.ts` (inclui dropdown do sino, busca/filtro e remoção)
- `community-invite-transfer.spec.ts`
- `opportunities-flow.spec.ts`
- `pages-and-filters.spec.ts`
- `password-recovery.spec.ts`
- `player-and-api.spec.ts`
- `playlist-watch-screen.spec.ts`
- `publish-edit-delete.spec.ts`
- `smoke.spec.ts`
- `uptime-status.spec.ts`

## Matriz por Módulo e Funções

Legenda:
- `C` Criar
- `E` Editar
- `V` Visualizar/Listar
- `X` Exportar
- `I` Inativar/Bloquear/Arquivar
- `D` Deletar/Limpar
- `F` Filtrar/Buscar
- `R` Funções específicas/regras

### Core da Plataforma
- Auth: `C V E D F R` coberto (API + E2E)
- Perfil de usuário: `E V F R` coberto (API + E2E)
- Feed/Postagens: `C E V D F R` coberto (API + E2E)
- Comentários: `C V D R` coberto (API + E2E)
- Notificações: `V D F R` coberto (API + E2E)
- Chat: `C E V D I F R` coberto (API + E2E, com player de áudio inline)

### Comunidades e Colaboração
- Comunidades: `C E V I D F R` coberto (API + E2E)
- Convites/membros/transferência: `C E V D F R` coberto (API + E2E)

### Conteúdo e Catálogo
- Playlists/temporadas/episódios: `C E V D F R` coberto (API + E2E)
- Oportunidades/Dubbing tests: `C E V I D F R` coberto (API + E2E)
- Conquistas: `V R` coberto (Unit + API + E2E)

### Admin
- Usuários, comunidades, posts, playlists, oportunidades, comentários, notificações, roles/permissões, logs e system logs:
  - `C E V X I D F R` coberto por API (`AdminCoreApiTest.php` + `AdminContentModulesApiTest.php`)

## Qualidade e Segurança no Pipeline

- Lint/build frontend.
- Feature/unit backend.
- E2E frontend (Playwright).
- Security audit:
  - `composer audit --locked`
  - `npm --prefix frontend audit --omit=dev --audit-level=high`
  - `npm --prefix admin audit --omit=dev --audit-level=high`
