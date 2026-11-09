# CONTEXTO PARA AGENTES DE IA — ÍNDICE ÚNICO

> Gerado automaticamente por indice.py · 2026-11-09 10:57 UTC · HEAD `d61122af8d` · Não edite à mão.

Um sistema, três fontes de verdade, três produtores independentes. **Leia este arquivo e vá direto à fonte certa.** Cada fato tem um dono: se duas fontes discordarem, vale o dono.

## Onde está cada coisa

| Preciso de… | Fonte (dona do fato) | Onde ler | Estado |
|---|---|---|---|
| Regras que não podem ser quebradas: RLS por operação, estados e transições, validações, fórmulas, prazos, erros de negócio, testes como especificação, inconsistências código×schema (NÃO VERIFICADO) e regras humanas (`manual/`) | **regras de negócio** | `docs/contexto/regras/07-REGRAS-DE-NEGOCIO.md` | ok · 54 min atrás |
| Tabelas, colunas, RLS/políticas, funções, triggers, cron, storage, lints — **como está em produção agora** | **banco real** | `docs/contexto/supabase/README.md` | parcial · 0 min atrás · ⚠️ 4 erro(s) de coleta no manifest (erros); 4 seção(ões) com erro em errors.md |
| Rotas, telas, módulos, hooks, edge functions, grafo de dependências, testes, scripts, convenções | **código** | `docs/contexto/codigo/INDEX.md` | ok · 53 min atrás |

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
- `docs/contexto/supabase/tables/public/csp_violation_reports.md`
- `docs/contexto/supabase/tables/public/daily_summaries.md`
- `docs/contexto/supabase/tables/public/dashboard_layouts.md`
- `docs/contexto/supabase/tables/public/dashboard_presets.md`
- `docs/contexto/supabase/tables/public/document_versions.md`
- `docs/contexto/supabase/tables/public/edge_health_history.md`
- `docs/contexto/supabase/tables/public/efficiency_alert_history.md`
- `docs/contexto/supabase/tables/public/energy_alerts.md`
- `docs/contexto/supabase/tables/public/energy_consumption.md`
- `docs/contexto/supabase/tables/public/energy_targets.md`
- `docs/contexto/supabase/tables/public/error_logs.md`
- `docs/contexto/supabase/tables/public/feature_flags.md`
- `docs/contexto/supabase/tables/public/gamification_rewards.md`
- `docs/contexto/supabase/tables/public/geo_blocking_logs.md`
- `docs/contexto/supabase/tables/public/geo_blocking_rules.md`
- `docs/contexto/supabase/tables/public/geo_blocking_settings.md`
- `docs/contexto/supabase/tables/public/inventory_items.md`
- `docs/contexto/supabase/tables/public/inventory_movements.md`
- `docs/contexto/supabase/tables/public/ip_allowlist.md`
- `docs/contexto/supabase/tables/public/job_status_audit.md`
- `docs/contexto/supabase/tables/public/job_status_history.md`
- `docs/contexto/supabase/tables/public/jobs.md`
- `docs/contexto/supabase/tables/public/kpi_alerts.md`
- `docs/contexto/supabase/tables/public/login_audit.md`
- `docs/contexto/supabase/tables/public/login_lockouts.md`
- `docs/contexto/supabase/tables/public/lot_components.md`
- `docs/contexto/supabase/tables/public/lot_movements.md`
- `docs/contexto/supabase/tables/public/lot_quality_inspections.md`
- `docs/contexto/supabase/tables/public/machine_downtime.md`
- `docs/contexto/supabase/tables/public/machine_event_audit.md`
- `docs/contexto/supabase/tables/public/machine_health_metrics.md`
- `docs/contexto/supabase/tables/public/machine_predictions.md`
- `docs/contexto/supabase/tables/public/machines.md`
- `docs/contexto/supabase/tables/public/maintenance_alerts.md`
- … +85

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
