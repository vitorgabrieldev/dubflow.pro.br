# Sistema de Assinaturas

Planejamento de como evoluir a aplicacao para um modelo de assinatura, partindo do que existe hoje.

## Objetivo

Estruturar uma base de monetizacao sem quebrar o fluxo atual do produto, com foco em:

- regras claras de plano;
- controle de limites por organizacao;
- cobranca auditavel;
- evolucao incremental (MVP -> escala).

## Estado atual (hoje)

### O que ja existe e pode ser reaproveitado

- Dominio com `organizations`, `organization_members`, `playlists`, `posts`, `chat`, `notifications`.
- Controle de acesso por papeis (`owner`, `admin`, `editor`, `member`) em [app/Support/OrganizationAccess.php](../app/Support/OrganizationAccess.php).
- Campo `settings` por organizacao em [app/Models/Organization.php](../app/Models/Organization.php), util para flags temporarias de rollout.
- Limites tecnicos ja existem em alguns fluxos (ex.: chat com maximo de anexos e tamanho de arquivo em [app/Http/Controllers/Api/V1/ChatController.php](../app/Http/Controllers/Api/V1/ChatController.php)).

### O que ainda nao existe

- Tabelas de billing/assinatura no banco.
- Integracao com gateway de pagamento (checkout, webhook, fatura).
- Camada de `entitlements` centralizada para liberar/bloquear funcionalidades por plano.
- Painel para operacao financeira (status, falha de pagamento, cancelamento, reativacao).

## Decisoes de produto recomendadas

Antes de codar, travar estas regras:

1. Unidade de cobranca: por `organizacao` (nao por usuario individual).
2. Moeda e regiao: iniciar em BRL.
3. Ciclo: mensal primeiro; anual na segunda fase.
4. Trial: opcional, com duracao fixa.
5. Politica de downgrade: imediato ou no fim do ciclo.
6. Politica de atraso de pagamento: janela de tolerancia + bloqueio progressivo.

## Proposta inicial de planos

### Estrategia recomendada de lancamento

- `Free` deve refletir o que o produto ja entrega hoje.
- Lancar comercialmente com `Free` e `Pro` no primeiro ciclo.
- Validar conversao e churn por 60-90 dias.
- Liberar `Studio` e `Business` depois da validacao inicial.

### Regras base do MVP

- Cobranca principal por `organizacao`.
- Regra global de conta: cada usuario pode participar de ate `10` comunidades.
- No `Free`, personalizacao de perfil e comunidade fica igual ao estado atual.
- Limite atingido bloqueia apenas criacao nova, sem remover conteudo existente.

### Grade sugerida (por organizacao, com precos recomendados)

| Plano | Preco mensal sugerido | Preco anual sugerido | Membros ativos | Episodios por mes | Armazenamento de episodios | Personalizacao | Recursos |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Free | R$ 0 | - | ate 15 | ate 30 | ate 10 GB | atual (sem extras) | base da plataforma |
| Pro | R$ 59 | R$ 590 | ate 50 | ate 200 | ate 100 GB | intermediaria | analytics basico, prioridade media |
| Studio | R$ 189 | R$ 1.890 | ate 150 | ate 1.000 | ate 500 GB | avancada | analytics avancado, suporte prioritario |
| Business | a partir de R$ 699 | sob proposta | customizado | customizado | customizado | customizada | SLA, onboarding e suporte dedicado |

### Entitlements minimos por plano

- `user.organizations.max`: `10` (regra global da conta no MVP)
- `members.max`: `15` -> `50` -> `150` -> `custom`
- `posts.monthly.max`: `30` -> `200` -> `1000` -> `custom`
- `storage.gb.max`: `10` -> `100` -> `500` -> `custom`
- `upload.file_size_mb.max`: `50` -> `150` -> `300` -> `custom`
- `analytics.enabled`: `false` -> `true` -> `true` -> `true`
- `priority_support.enabled`: `false` -> `false` -> `true` -> `true`
- `customization.level`: `current` -> `intermediate` -> `advanced` -> `custom`

### Regras comerciais sugeridas

- Upgrade: imediato, com cobranca proporcional no mesmo ciclo.
- Downgrade: no fim do ciclo para evitar perda abrupta de recurso.
- Excedeu limite: bloquear criacao nova, nunca quebrar o que ja existe.
- Trial: 7 dias no `Pro` para organizacoes novas.
- Preco anual com desconto efetivo de 15% a 20%.
- Add-on recomendado: pacote extra de `50 GB` por `R$ 19/mes`.

## Modelo alvo de assinatura

### Entidades novas (backend/database)

- `plans`: catalogo de planos (slug, nome, ativo).
- `plan_prices`: preco por ciclo e moeda.
- `plan_entitlements`: limites e features por plano.
- `subscriptions`: assinatura por organizacao.
- `subscription_events`: trilha de mudancas de estado.
- `billing_customers`: vinculo organizacao <-> cliente no gateway.
- `billing_webhook_events`: idempotencia e auditoria de webhooks.

### Entitlements (chaves de exemplo)

- `members.max`
- `posts.monthly.max`
- `playlists.max`
- `chat.attachments.max`
- `chat.attachment_size_mb.max`
- `analytics.enabled`
- `priority_support.enabled`

## Arquitetura tecnica

### Principio

Separar regra de negocio de assinatura do provedor de pagamento.

### Componentes

- `BillingProviderInterface`: contrato unico (criar cliente, checkout, cancelar, sincronizar status).
- Implementacao de provedor (ex.: `StripeProvider`, `AsaasProvider`) atras da interface.
- `SubscriptionService`: aplica transicoes de estado e regras de grace period.
- `EntitlementService`: resolve o plano ativo da organizacao e responde limites/features.
- Middleware/Policy de acesso por entitlement nos endpoints criticos.

### Webhooks

- Endpoint autenticado por assinatura do gateway.
- Persistencia do evento bruto.
- Idempotencia por `event_id`.
- Reprocessamento seguro em caso de falha.
- Publicacao de evento interno para atualizar cache e UI.

## Fluxos essenciais

1. Upgrade de plano
   - Owner inicia checkout.
   - Pagamento aprovado.
   - Webhook confirma.
   - Assinatura vira `active`.
   - Entitlements atualizados em tempo real.

2. Renovacao automatica
   - Gateway cobra no ciclo.
   - Webhook de sucesso mantem status ativo.
   - Webhook de falha muda para `past_due`.

3. Falha de pagamento (dunning)
   - Notificacoes em marcos (D+0, D+3, D+7).
   - Periodo de tolerancia.
   - Bloqueio progressivo de features premium.

4. Cancelamento
   - `cancel_at_period_end` como padrao.
   - Reativacao possivel ate fim do ciclo.
   - Historico preservado para auditoria.

## Roadmap de evolucao

### Fase 1 - Fundacao (MVP de assinatura)

- Criar schema de billing e eventos.
- Implementar `EntitlementService` com fallback para plano `free`.
- Adicionar plano `free` e `pro` no catalogo.
- Expor endpoint de status da assinatura por organizacao.
- UI simples para owner ver plano atual e limites.

### Fase 2 - Cobranca real

- Integrar 1 gateway de pagamento.
- Implementar checkout + webhooks + idempotencia.
- Ativar upgrade/downgrade/cancelamento.
- Notificacoes de cobranca e falha.

### Fase 3 - Operacao e escala

- Painel interno de billing (suporte/financeiro).
- Relatorios de conversao, churn, MRR.
- Plano `studio`, anual, cupom e promocao.
- Melhorias de dunning e recuperacao de receita.

## Backlog tecnico sugerido

### Backend

- Criar migrations de billing e assinatura.
- Criar camada de dominio (`Plan`, `Subscription`, `Entitlement`).
- Adicionar guardas de entitlement em upload, chat, publicacao e limites de membros.
- Cobertura de testes: unitarios + feature + webhook idempotente.

### Frontend

- Tela "Assinatura" para owner da organizacao.
- Componente de comparacao de planos.
- Banner de limite atingido com CTA de upgrade.
- Estados claros para `active`, `past_due`, `canceled`, `trialing`.

### DevOps

- Variaveis seguras do gateway em ambiente.
- Observabilidade de webhook (latencia, erro, reprocessamento).
- Alertas para fila de eventos pendentes.
- Rotina de reconciliacao diaria com gateway.

## Criterios de pronto (Definition of Done)

- Assinatura muda de estado por webhook com idempotencia.
- Entitlements refletem o plano em ate 1 minuto apos evento.
- Bloqueios por limite acontecem no backend (nao so no frontend).
- Owner consegue ver plano, limites, proxima cobranca e historico basico.
- Testes automatizados cobrindo cenarios criticos de cobranca.

## Riscos e mitigacoes

- Risco: acoplamento forte ao gateway.
  Mitigacao: `BillingProviderInterface` + mapeamento de eventos interno.

- Risco: bloqueio incorreto de funcionalidade.
  Mitigacao: regras centralizadas no `EntitlementService` + testes de regressao.

- Risco: webhook duplicado ou fora de ordem.
  Mitigacao: tabela de idempotencia + maquina de estados defensiva.
