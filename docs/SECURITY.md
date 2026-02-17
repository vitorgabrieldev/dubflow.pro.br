# Segurança

## Controles Implementados
- autenticação JWT com cookie `httpOnly`.
- refresh de token em fluxos sensíveis de escrita.
- controle de acesso por papel (`owner/admin/editor/member`).
- headers de segurança (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`).
- throttle em API (`auth` e endpoints autenticados).
- validação estrita de upload (tipo e tamanho).

## Observabilidade de Segurança
- logs de request com `X-Request-Id`.
- trilha de auditoria em ações críticas:
  - Comunidade (criação, follow/unfollow, solicitação de entrada)
  - posts (criação, edição, remoção)
  - interações (like/unlike, comentários, colaboração)
  - convites de comunidade
- workflows de segurança no GitHub:
  - dependency review
  - composer audit
  - npm audit
  - code scanning (CodeQL)

## Checklist de Produção
- habilitar `APP_ENV=production`, `APP_DEBUG=false`.
- usar HTTPS em toda a borda.
- armazenar uploads em object storage.
- configurar WAF/rate limit na camada de infra.
- usar rotação de chaves e segredos via GitHub Environments.

## Melhorias Recomendadas (Próximas)
- 2FA opcional para owners/admins.
- rotação de refresh tokens com lista de revogação.
- política de senha forte e bloqueio progressivo por tentativas.
- signed URLs temporárias para upload/download.
