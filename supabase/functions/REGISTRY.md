# Registry de Edge Functions — gatilhos e validação de entrada

33 functions. Este arquivo responde: **quem pode chamar cada function, de onde,
e se o gatilho está versionado no repositório.** Sem isso, nenhuma function pode
ser considerada "órfã" com segurança — algumas são chamadas por fora do código
(pg_cron, DB webhooks do painel, integrações externas) e não aparecem em grep.

Complementa `README.md` (inventário da camada 2 de autenticação).

## Legenda de gatilho

- **frontend** — `supabase.functions.invoke()` ou `edgeFunctionFetch()` em `src/`.
- **pg_cron** — job agendado no banco. O schedule só está versionado se houver
  `cron.schedule(...)` em `supabase/migrations/` — do contrário vive só no painel.
- **db-webhook** — Database Webhook do Supabase (INSERT/UPDATE em tabela).
  Configurado no painel, **não** versionável por migration — a única fonte de
  verdade é o painel. Ver seção "Webhooks de banco" abaixo.
- **db-trigger** — `pg_net.http_post` dentro de trigger PL/pgSQL versionado.
- **externo** — chamado por sistema de fora (ERP, Bitrix24, webhooks de push).
- **interno** — chamado por outra edge function.
- **órfã** — nenhum gatilho encontrado em código, migrations ou integrações
  conhecidas. Não deletar sem confirmar no painel de crons/webhooks.

## Tabela

| Function | Gatilho | Versionado onde | Validação de entrada |
|---|---|---|---|
| approve-password-reset | frontend (admin) | `src/` invoke | zod via `_shared` |
| auto-promote-jobs | frontend + db-trigger (`on_job_finished_promote` → `trigger_auto_promotion`) + pg_cron (`auto-promote-jobs-fallback`, */5min) | migration `20260512110942` + `20261001143100` | própria |
| backup-scheduler | pg_cron **(painel — não versionado)** | — | própria |
| bitrix24-sync | frontend + externo (webhook Bitrix24) | `src/` | `_shared/contracts` |
| calculate-inventory-intelligence | frontend + pg_cron (painel) | `src/` | `_shared` |
| calculate-rankings | frontend + pg_cron (painel) | `src/` | própria |
| check-login-lockout | frontend (pré-login) | `authService.ts` | `lockoutRequestSchema` |
| cleanup-security-logs | pg_cron **(painel — não versionado)** | — | própria |
| create-operator | frontend (admin, AAL2) | `src/` | zod via `_shared` |
| cron-alert-email | pg_cron **(painel — não versionado)** | — | própria |
| cron-cleanup | pg_cron **(painel — não versionado)** | — | própria |
| daily-maintenance-summary | frontend + pg_cron (painel) | `src/` | própria |
| erp-api | externo (ERP/Bitrix24, `x-api-key`) | contrato em `src/test/erpApiContracts.test.ts` | `_shared/contracts` |
| excel-export | **órfã** — frontend usa `src/lib/excelExport.ts` (geração client-side); esta function não tem chamador | — | própria |
| external-db-bridge | **órfã** — ponte SQL genérica, sem chamador em `src/`; provável uso por ERP/script externo. Confirmar antes de remover. | — | `_shared` |
| health-check | interno (`health-monitor`) + monitoramento externo | `health-monitor/index.ts` | n/a (GET stub) |
| health-monitor | pg_cron **(painel — não versionado; README histórico diz */5min)** | — | própria |
| image-optimizer | nenhum — stub 501 por design | — | n/a |
| metrics-collector | pg_cron **(painel — não versionado)** | — | própria |
| ml-predictions | frontend | `src/` | `_shared` |
| new-device-alert | frontend (pós-login) | `src/` | própria |
| pdf-generator | frontend | `src/` | própria |
| rate-limit-check | **órfã** — criada para o fluxo de login, nunca ligada (`authService` chama só `check-login-lockout`) | — | própria |
| security-alert | pg_cron **(painel — não versionado)** | — | própria |
| send-email-report | pg_cron **(painel — não versionado)** | — | própria |
| send-loss-risk-alert | db-webhook (`tpm_execution_alerts` INSERT) **(painel — não versionado)** | — | `tpmExecutionAlertWebhookSchema` |
| send-push-notification | frontend + interno (`new-device-alert`) | `src/`, `new-device-alert/index.ts` | própria |
| send-tpm-email | db-webhook (`maintenance_alerts` INSERT) **(painel — não versionado)**; migration `20261001143100` corrige a função `trigger_send_tpm_email` para a URL canonical (gatilho permanece desativado por design) | — | `tpmAlertWebhookSchema` |
| technical-assistant | frontend (`edgeFunctionFetch`) | `src/pages/TechnicalAssistantPage.tsx` | própria |
| tpm-notifications | pg_cron **(painel — não versionado)** | — | própria |
| update-operator | frontend (admin) | `src/` | própria |
| validate-login-ip | **órfã** — rate-limit-by-IP fail-open, nunca ligada ao login | — | `validateIPRequestSchema` |
| webhook-handler | frontend + externo (providers de webhook) | `src/` | `_shared/contracts` |

## Crons versionados vs. painel

Versionados em `supabase/migrations/`:
- `rollup-cron-p95-daily` (`20260726161334`) — SQL interno, sem function.
- `auto-promote-jobs-fallback` (`20260512110942`, reagendado com URL corrigida
  em `20261001143100`) — */5min → `auto-promote-jobs`.

**Todos os demais crons (backup-scheduler, health-monitor, metrics-collector,
cron-alert-email, cron-cleanup, cleanup-security-logs, security-alert,
send-email-report, tpm-notifications, daily-maintenance-summary,
calculate-rankings, calculate-inventory-intelligence) vivem só no painel do
Supabase.** Não há fonte de verdade versionada — documentar schedules aqui ou
migrá-los para `cron.schedule` em migrations futuras.

## Webhooks de banco (painel, não versionados)

- `maintenance_alerts` INSERT → `send-tpm-email`
- `tpm_execution_alerts` INSERT → `send-loss-risk-alert`

Ambos exigem header `x-cron-secret` (ou service-role/`WEBHOOK_API_KEY` no caso
de `send-loss-risk-alert`). Se recriar os webhooks, configurar o header no painel.

## Órfãs — decisão documentada

| Function | Decisão |
|---|---|
| excel-export | Manter por ora — pode ser chamada por script/ERP externo. Reavaliar após confirmar ausência no painel e nos logs de invocação. |
| external-db-bridge | Manter — ponte genérica que integrações externas podem usar. Alto risco se for lixo real (expõe SQL arbitrário com service role? revisar). |
| rate-limit-check | Manter — planejada para o fluxo de login; ligar ou remover em PR futuro. |
| validate-login-ip | Manter — mesma situação; fail-open por design. |
| image-optimizer | Manter — stub explícito (501), documentado. |
