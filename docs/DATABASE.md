# Banco de Dados (DubFlow)

## Entidades Principais
- `users`: conta, dados de perfil e portfólio.
- `organizations`: comunidades de dublagem.
- `organization_members`: vínculo e papel do usuário na comunidade.
- `organization_follows`: seguidores de comunidade.
- `organization_invites`: links de convite com expiração e limite de uso.
- `playlists`: agrupador de episódios por obra.
- `playlist_seasons`: temporadas dentro da playlist.
- `dubbing_posts`: episódios/materiais publicados.
- `post_collaborators`: aprovação de colaboradores.
- `post_credits`: crédito por personagem/dublador.
- `post_likes`: curtidas.
- `comments`: comentários com até 2 níveis.
- `post_views`: visualizações com fingerprint.
- `tags` + `dubbing_post_tag`: taxonomia.
- `notifications`: central in-app.

## Relacionamentos de Negócio
- um `user` pode ser `owner/admin/editor/member` em múltiplas organizações.
- uma `organization` pode ter múltiplas `playlists`.
- uma `playlist` pode ter múltiplas `seasons`.
- um `post` pode existir com ou sem `playlist/season` (episódio avulso).

## Regras Críticas
- publicação com colaboradores pendentes não entra no feed público.
- comentário aceita resposta apenas em comentário raiz (2 níveis).
- convites de comunidade respeitam `max_uses`, `expires_at` e `revoked_at`.

## Índices Relevantes
- Comunidade: visibilidade + criação.
- posts: visibilidade + publicação, Comunidade + criação.
- convites: token + expiração.
- comentários: post + criação.

