# CONTEXTO PARA AGENTES DE IA — ÍNDICE ÚNICO

> Gerado automaticamente por indice.py · 2026-11-11 11:20 UTC · HEAD `c9c9f66b44` · Não edite à mão.

Um sistema, três fontes de verdade, três produtores independentes. **Leia este arquivo e vá direto à fonte certa.** Cada fato tem um dono: se duas fontes discordarem, vale o dono.

## Onde está cada coisa

| Preciso de… | Fonte (dona do fato) | Onde ler | Estado |
|---|---|---|---|
| Regras que não podem ser quebradas: RLS por operação, estados e transições, validações, fórmulas, prazos, erros de negócio, testes como especificação, inconsistências código×schema (NÃO VERIFICADO) e regras humanas (`manual/`) | **regras de negócio** | `docs/contexto/regras/07-REGRAS-DE-NEGOCIO.md` | parcial · 67 min atrás · ⚠️ 1 erro(s) de coleta no manifest (erros): snapshot `docs/contexto/supabase/` não existe nesta execução — RLS, restrições, triggers e colunas de status foram derivados de migrations e podem divergir do b…; 2 aviso(s) do produtor no manifest |
| Tabelas, colunas, RLS/políticas, funções, triggers, cron, storage, lints — **como está em produção agora** | **banco real** | `docs/contexto/supabase/README.md` | parcial · 0 min atrás · ⚠️ 4 erro(s) de coleta no manifest (erros); seções reaproveitadas da coleta anterior; 4 seção(ões) com erro em errors.md |
| Rotas, telas, módulos, hooks, edge functions, grafo de dependências, testes, scripts, convenções | **código** | `docs/contexto/codigo/INDEX.md` | ok · 66 min atrás |

## Ordem de leitura antes de qualquer tarefa ou planejamento

1. **regras de negócio** — Qualquer mudança de comportamento · Antes de criar status/valor/validação · Antes de planejar.
2. **banco real** — Vou tocar tabela/coluna/política/função SQL · Quero saber se algo existe de verdade no banco.
3. **código** — Vou mexer em tela/rota/hook/edge · Preciso saber onde uma coisa vive e quem a usa.

## Regras do protocolo

- Tabela/coluna/política existe? → **banco real**. Migrations do repo são histórico, não estado.
- Onde fica, quem chama, o que importa o quê? → **código**.
- Pode fazer isso? Qual estado vem depois? Qual o limite? → **regras de negócio** (inclui `manual/`, escrito por humanos, prioridade máxima).
- Item listado como **NÃO VERIFICADO** ou **inconsistência** em qualquer fonte: confirme na fonte dona antes de assumir.
- Nada aqui é editado à mão. Para registrar uma regra que só o negócio sabe, escreva em `manual/` da fonte de regras.

<details><summary>Arquivos de <b>banco real</b> (`docs/contexto/supabase/`)</summary>

- `docs/contexto/supabase/CHANGELOG.md`
- `docs/contexto/supabase/README.md`
- `docs/contexto/supabase/auth.md`
- `docs/contexto/supabase/cron-runs.md`
- `docs/contexto/supabase/cron.md`
- `docs/contexto/supabase/edge-functions.md`
- `docs/contexto/supabase/edge-functions/approve-password-reset/README.md`
- `docs/contexto/supabase/edge-functions/auto-promote-jobs/README.md`
- `docs/contexto/supabase/edge-functions/backup-scheduler/README.md`
- `docs/contexto/supabase/edge-functions/bitrix24-sync/README.md`
- `docs/contexto/supabase/edge-functions/calculate-inventory-intelligence/README.md`
- `docs/contexto/supabase/edge-functions/calculate-rankings/README.md`
- `docs/contexto/supabase/edge-functions/check-login-lockout/README.md`
- `docs/contexto/supabase/edge-functions/cleanup-security-logs/README.md`
- `docs/contexto/supabase/edge-functions/create-operator/README.md`
- `docs/contexto/supabase/edge-functions/cron-alert-email/README.md`
- `docs/contexto/supabase/edge-functions/cron-cleanup/README.md`
- `docs/contexto/supabase/edge-functions/csp-report/README.md`
- `docs/contexto/supabase/edge-functions/daily-maintenance-summary/README.md`
- `docs/contexto/supabase/edge-functions/erp-api/README.md`
- `docs/contexto/supabase/edge-functions/excel-export/README.md`
- `docs/contexto/supabase/edge-functions/external-db-bridge/README.md`
- `docs/contexto/supabase/edge-functions/health-check/README.md`
- `docs/contexto/supabase/edge-functions/health-monitor/README.md`
- `docs/contexto/supabase/edge-functions/image-optimizer/README.md`
- `docs/contexto/supabase/edge-functions/metrics-collector/README.md`
- `docs/contexto/supabase/edge-functions/ml-predictions/README.md`
- `docs/contexto/supabase/edge-functions/new-device-alert/README.md`
- `docs/contexto/supabase/edge-functions/pdf-generator/README.md`
- `docs/contexto/supabase/edge-functions/rate-limit-check/README.md`
- `docs/contexto/supabase/edge-functions/security-alert/README.md`
- `docs/contexto/supabase/edge-functions/send-email-report/README.md`
- `docs/contexto/supabase/edge-functions/send-loss-risk-alert/README.md`
- `docs/contexto/supabase/edge-functions/send-push-notification/README.md`
- `docs/contexto/supabase/edge-functions/send-tpm-email/README.md`
- `docs/contexto/supabase/edge-functions/technical-assistant/README.md`
- `docs/contexto/supabase/edge-functions/tpm-notifications/README.md`
- `docs/contexto/supabase/edge-functions/update-operator/README.md`
- `docs/contexto/supabase/edge-functions/validate-login-ip/README.md`
- `docs/contexto/supabase/edge-functions/webhook-handler/README.md`
- `docs/contexto/supabase/errors.md`
- `docs/contexto/supabase/extensions.md`
- `docs/contexto/supabase/foreign-servers.md`
- `docs/contexto/supabase/functions.md`
- `docs/contexto/supabase/grants.md`
- `docs/contexto/supabase/indexes.md`
- `docs/contexto/supabase/lints.md`
- `docs/contexto/supabase/manifest.json`
- `docs/contexto/supabase/migrations.md`
- `docs/contexto/supabase/policies.md`
- `docs/contexto/supabase/project-config.md`
- `docs/contexto/supabase/queues.md`
- `docs/contexto/supabase/realtime.md`
- `docs/contexto/supabase/relationships.md`
- `docs/contexto/supabase/roles.md`
- `docs/contexto/supabase/schemas.md`
- `docs/contexto/supabase/sequences.md`
- `docs/contexto/supabase/snapshot.json`
- `docs/contexto/supabase/stats.json`
- `docs/contexto/supabase/stats.md`
- `docs/contexto/supabase/storage.md`
- `docs/contexto/supabase/tables.md`
- `docs/contexto/supabase/tables/_supabase_internal_triggers.md`
- `docs/contexto/supabase/tables/app_private/runtime_config.md`
- `docs/contexto/supabase/tables/public/abc_activities.md`
- `docs/contexto/supabase/tables/public/abc_activity_rates.md`
- `docs/contexto/supabase/tables/public/abc_cost_pools.md`
- `docs/contexto/supabase/tables/public/abc_job_costs.md`
- `docs/contexto/supabase/tables/public/archived_jobs.md`
- `docs/contexto/supabase/tables/public/audit_log.md`
- `docs/contexto/supabase/tables/public/backup_logs.md`
- `docs/contexto/supabase/tables/public/bitrix24_field_mappings.md`
- `docs/contexto/supabase/tables/public/bitrix24_oauth_states.md`
- `docs/contexto/supabase/tables/public/bitrix24_oauth_tokens.md`
- `docs/contexto/supabase/tables/public/bitrix24_sync_history.md`
- `docs/contexto/supabase/tables/public/blocked_ips.md`
- `docs/contexto/supabase/tables/public/business_config.md`
- `docs/contexto/supabase/tables/public/chat_messages.md`
- `docs/contexto/supabase/tables/public/cron_health_history.md`
- `docs/contexto/supabase/tables/public/cron_p95_daily.md`
- … +119

</details>

<details><summary>Arquivos de <b>código</b> (`docs/contexto/codigo/`)</summary>

- `docs/contexto/codigo/GRAPH_REPORT.md`
- `docs/contexto/codigo/INDEX.md`
- `docs/contexto/codigo/banco.json`
- `docs/contexto/codigo/baseline.json`
- `docs/contexto/codigo/componentes.json`
- `docs/contexto/codigo/convencoes.json`
- `docs/contexto/codigo/edge-functions.json`
- `docs/contexto/codigo/ferramentas.json`
- `docs/contexto/codigo/grafo-arestas.json`
- `docs/contexto/codigo/grafo-graphify.json`
- `docs/contexto/codigo/grafo.json`
- `docs/contexto/codigo/hooks.json`
- `docs/contexto/codigo/logica.json`
- `docs/contexto/codigo/manifest.json`
- `docs/contexto/codigo/modulos.json`
- `docs/contexto/codigo/rotas.json`
- `docs/contexto/codigo/scripts.json`
- `docs/contexto/codigo/testes.json`

</details>

<details><summary>Arquivos de <b>regras de negócio</b> (`docs/contexto/regras/`)</summary>

- `docs/contexto/regras/07-REGRAS-DE-NEGOCIO.md`
- `docs/contexto/regras/10-ACESSO-E-SEGURANCA.md`
- `docs/contexto/regras/11-GLOSSARIO-E-LACUNAS.md`
- `docs/contexto/regras/context.json`
- `docs/contexto/regras/manifest.json`
- `docs/contexto/regras/manual/README.md`
- `docs/contexto/regras/manual/TEMPLATE-regras-de-negocio.md`
- `docs/contexto/regras/manual/regras-implementadas-2026-11.md`

</details>
