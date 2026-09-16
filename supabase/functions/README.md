# Edge Functions — inventário de autenticação

33 functions em `supabase/functions/`. Todas rodam com `verify_jwt = true`
(declarado explicitamente em `supabase/config.toml`, ver o comentário lá para
o porquê). Esta tabela documenta a **camada 2** — a checagem feita pelo
próprio código da function, por cima do gate de JWT do gateway — para que
qualquer decisão futura sobre uma function específica não dependa de reler
o código do zero.

Classificação:
- **user** — exige `auth.getUser()` retornando um usuário válido (sessão real).
- **user+role** — `user`, mais checagem de papel (`coordinator`/`admin`) e,
  em alguns casos, AAL2 (MFA) via `_shared/auth.ts`.
- **cron** — `requireCronSecret` (`_shared/cronAuth.ts`); só aceita o
  `CRON_SECRET` configurado, `failClosed: true` (sem secret configurado →
  rejeita, nunca abre).
- **user-or-cron** — `requireUserOrCronSecret`: aceita sessão de usuário OU
  o cron secret, para endpoints acionados tanto por UI quanto por schedule.
- **hmac** — valida assinatura do provedor externo (webhook) além do JWT do
  gateway.
- **rate-limit-only** — sem checagem de identidade própria; depende do JWT do
  gateway (anon ou de usuário) mais `_shared/rateLimit.ts`. Uso típico: fluxo
  de login antes de existir sessão.
- **public-stub** — sem checagem; endpoint stub/observável por design
  (health check, função não implementada).

| Function | Camada 2 | Notas |
|---|---|---|
| approve-password-reset | user+role | `auth.getUser()` + checagem de papel do solicitante |
| auto-promote-jobs | cron | `requireCronSecret` |
| backup-scheduler | cron | `requireCronSecret({ failClosed: true })`; exporta tabelas completas |
| bitrix24-sync | user + hmac | `auth.getUser()` para chamadas internas; valida assinatura do webhook Bitrix24 |
| calculate-inventory-intelligence | user-or-cron | `requireUserOrCronSecret` |
| calculate-rankings | cron | `requireCronSecret` |
| check-login-lockout | rate-limit-only | `getUser()` opcional (contexto), fluxo de login pré-sessão |
| cleanup-security-logs | cron | `requireCronSecret({ failClosed: true })` |
| create-operator | user+role (AAL2) | `_shared/auth.ts`: `authenticate` + `requireElevatedAal2`, papel `coordinator`/`admin` — operação administrativa (Etapa 7 do plano-mestre) |
| cron-alert-email | cron | `requireCronSecret` |
| cron-cleanup | cron | `requireCronSecret` |
| daily-maintenance-summary | user-or-cron | `requireUserOrCronSecret` |
| erp-api | user | `auth.getUser(token)` |
| excel-export | user | `auth.getUser()` |
| external-db-bridge | user | `auth.getUser(token)` |
| health-check | public-stub | agregador de observabilidade, sem segredo próprio; não expõe segredos, só status/latência |
| health-monitor | cron | `CRON_SECRET` (schedule a cada 5 min via pg_cron); chama outras functions com a service-role key |
| image-optimizer | public-stub | não implementado — sempre responde 501, sem side effect |
| metrics-collector | cron | `requireCronSecret({ failClosed: true })` |
| ml-predictions | user | `auth.getUser(token)` |
| new-device-alert | user | `auth.getUser()` |
| pdf-generator | user | `auth.getUser()` |
| rate-limit-check | user | `auth.getUser()` |
| security-alert | cron | `requireCronSecret` |
| send-email-report | user | `auth.getUser()` |
| send-loss-risk-alert | cron | `requireCronSecret({ failClosed: true })`; aceita adicionalmente service-role key ou `WEBHOOK_API_KEY` |
| send-push-notification | user + hmac | `auth.getUser(providedKey)`; valida assinatura de push provider |
| send-tpm-email | cron | `requireCronSecret({ failClosed: true })` |
| technical-assistant | user | `auth.getUser()` |
| tpm-notifications | cron | `requireCronSecret({ failClosed: true })` |
| update-operator | user+role | `auth.getUser()` + checagem de papel do solicitante |
| validate-login-ip | rate-limit-only | sem sessão (fluxo de login pré-autenticação); `_shared/rateLimit.ts` |
| webhook-handler | hmac | valida assinatura do provedor externo |

## Sobre `verify_jwt = false`

Nenhuma function acima precisa de `verify_jwt = false` hoje: as de `cron`/
`user-or-cron` são chamadas com a service-role key (um JWT válido) mais o
`CRON_SECRET` como segundo fator; as de `hmac`/`public-stub` são chamadas
tipicamente com a anon key (também um JWT válido, é o que o client-side
`supabase.functions.invoke()` envia por padrão quando não há sessão). Manter
`true` em todas preserva a camada de gateway como primeiro filtro contra
tráfego sem JWT algum, antes mesmo do código da function rodar — reduz
superfície de ataque comparado a depender só da camada 2. Uma mudança para
`false` em qualquer uma exige teste contra o projeto Supabase canônico (não
apenas leitura de código) antes de aplicar.
