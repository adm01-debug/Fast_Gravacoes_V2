# Métricas (voláteis — mudam sem alteração de schema)

Valores aproximados de propósito, para não gerar commits a cada coleta. Fora de `snapshot.json`; o bruto está em `stats.json`.

## Banco

| métrica | valor |
|---|---|
| tamanho | 538.5 MB |
| schema public | 490.5 MB |
| schema app_private | 32.0 KB |


## Tabelas (ordenadas por tamanho)

| tabela | linhas (~) | total | heap | índices | linhas mortas (~) | seq scans (~) | idx scans (~) | último autovacuum |
|---|---|---|---|---|---|---|---|---|
| public.error_logs | ~1M | 470.1 MB | 415.0 MB | 54.9 MB | ~250 | 1 | ~470 | 2026-11-10 |
| public.cron_health_history | ~34.3k | 10.6 MB | 6.0 MB | 4.6 MB | ~10 | 1 | ~16.1k | 2026-11-07 |
| public.kpi_alerts | ~7.1k | 1.3 MB | 888.0 KB | 392.0 KB | 0 | 0 | 1 |  |
| public.telemetry_traces | ~1.7k | 1.2 MB | 448.0 KB | 720.0 KB | 0 | 1 | ~60 | 2026-11-08 |
| public.push_notifications | ~1.3k | 928.0 KB | 624.0 KB | 264.0 KB | ~10 | ~90 | ~46.2k | 2026-10-30 |
| public.audit_log | ~190 | 872.0 KB | 440.0 KB | 376.0 KB | ~40 | ~180 | ~204.2k | 2026-11-11 |
| public.jobs | ~170 | 432.0 KB | 88.0 KB | 304.0 KB | ~40 | ~76.8k | ~310.8k | 2026-11-11 |
| public.bitrix24_sync_history | ~500 | 240.0 KB | 128.0 KB | 80.0 KB | 0 | 1 | 1 |  |
| public.cron_p95_daily | ~440 | 216.0 KB | 80.0 KB | 96.0 KB | ~60 | ~1.5k | ~31.6k | 2026-09-10 |
| public.efficiency_alert_history | 1 | 192.0 KB | 16.0 KB | 136.0 KB | 0 | ~27.6k | ~13.8k |  |
| public.webhook_logs | 0 | 192.0 KB | 0 B | 88.0 KB | 0 | ~40 | ~30 | 2026-10-08 |
| public.archived_jobs | 0 | 128.0 KB | 0 B | 120.0 KB | 0 | ~20 | 0 |  |
| public.security_events | 1 | 112.0 KB | 8.0 KB | 96.0 KB | 0 | ~400 | 0 |  |
| public.role_permissions | 7 | 96.0 KB | 8.0 KB | 80.0 KB | 0 | ~34.3k | 0 |  |
| public.user_roles | 1 | 88.0 KB | 8.0 KB | 80.0 KB | 5 | ~12.1M | 4 |  |
| public.inventory_movements | 0 | 80.0 KB | 8.0 KB | 64.0 KB | 0 | ~38.1k | 1 |  |
| public.job_status_audit | 0 | 80.0 KB | 8.0 KB | 48.0 KB | ~40 | 4 | 0 | 2026-11-11 |
| public.machine_downtime | 0 | 80.0 KB | 8.0 KB | 64.0 KB | 0 | 1 | 2 |  |
| public.qr_scan_history | 0 | 80.0 KB | 8.0 KB | 64.0 KB | 0 | ~590 | ~12.9k |  |
| public.operator_machines | 0 | 72.0 KB | 8.0 KB | 64.0 KB | 0 | ~17.3k | ~250.3k |  |
| public.energy_consumption | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | 1 | 0 |  |
| public.inventory_items | ~10 | 64.0 KB | 8.0 KB | 16.0 KB | 0 | ~38.1k | ~363.7k |  |
| public.job_status_history | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | 1 | 3 |  |
| public.login_lockouts | 2 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | 1 | 0 |  |
| public.machine_event_audit | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | 1 | 3 |  |
| public.machines | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~43.6k | ~421.3k |  |
| public.maintenance_records | 0 | 64.0 KB | 0 B | 56.0 KB | 0 | ~1.3k | 5 |  |
| public.production_lots | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | 1 | 0 |  |
| public.technical_sheets | 0 | 64.0 KB | 0 B | 56.0 KB | 0 | 1 | ~6.1k |  |
| public.techniques | 6 | 64.0 KB | 8.0 KB | 16.0 KB | 0 | ~29.5k | ~772.1k |  |
| public.abc_activity_rates | 4 | 56.0 KB | 8.0 KB | 48.0 KB | 0 | ~580 | 0 |  |
| public.packaging_tasks | 0 | 56.0 KB | 0 B | 48.0 KB | 0 | 5 | ~12k |  |
| public.abc_activities | 4 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~580 | 0 |  |
| public.blocked_ips | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | 1 | 6 |  |
| public.business_config | 7 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~38k | 1 |  |
| public.daily_summaries | 8 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 2 | 0 |  |
| public.dashboard_layouts | 1 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~4.4k | 0 |  |
| public.feature_flags | 3 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 1 | 0 |  |
| public.tpm_executions | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | 1 | 3 |  |
| public.user_notification_settings | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 1 | ~360 |  |
| public.lot_components | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | 1 | 0 |  |
| public.packaging_sla_overrides | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~13.1k | 0 |  |
| public.password_reset_requests | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | 1 | 3 |  |
| public.rate_limit_logs | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | 1 | ~40 |  |
| public.shift_occurrences | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | 2 | 0 |  |
| public.shift_pending_tasks | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | 2 | 0 |  |
| public.spc_measurements | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | 1 | 0 |  |
| public.tpm_notification_queue | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | 4 | 0 |  |
| app_private.runtime_config | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 6 | 1 | ~28.9k |  |
| public.abc_cost_pools | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | ~580 | 0 |  |
| public.abc_job_costs | 0 | 32.0 KB | 0 B | 32.0 KB | 0 | ~580 | 3 |  |
| public.csp_violation_reports | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~10 | ~30 |  |
| public.energy_alerts | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 2 | 0 |  |
| public.gamification_rewards | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | ~4.5k | 0 |  |
| public.geo_blocking_logs | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 2 | ~30 |  |
| public.geo_blocking_rules | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 1 | 3 |  |
| public.geo_blocking_settings | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 4 | 3 |  |
| public.ip_allowlist | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 2 | 3 |  |
| public.login_audit | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 1 | ~400 |  |
| public.lot_movements | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 2 | 0 |  |
| public.maintenance_alerts | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~300 | 0 |  |
| public.maintenance_checklists | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~300 | 0 |  |
| public.maintenance_item_responses | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 1 | 0 |  |
| public.maintenance_schedules | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~300 | 0 |  |
| public.operator_status_audit | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 2 | 0 |  |
| public.packaging_checklist_items | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 1 | 0 |  |
| public.packaging_defects | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 4 | 0 |  |
| public.packaging_settings | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | ~13.1k | 0 |  |
| public.packaging_task_checklist | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 4 | 0 |  |
| public.prediction_history | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~10 | 0 |  |
| public.production_losses | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~420 | 2 |  |
| public.profiles | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 3 | ~41.9k | ~118.3k |  |
| public.push_subscriptions | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 1 | ~166.8k |  |
| public.query_telemetry | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 3 | ~960 |  |
| public.reward_redemptions | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 1 | ~8.4k |  |
| public.shipments | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 1 | 0 |  |
| public.shipping_providers | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | ~210 | 0 |  |
| public.spc_alerts | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 1 | 0 |  |
| public.technical_sheet_audit | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 1 | 3 |  |
| public.technical_sheet_audit_logs | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 1 | 3 |  |
| public.technical_sheet_materials | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 1 | 0 |  |
| public.technical_sheet_versions | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 1 | 3 |  |
| public.tpm_execution_audit_logs | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 1 | 3 |  |
| public.tpm_notification_logs | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 1 | 3 |  |
| public.user_devices | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 1 | 1 |  |
| public.bitrix24_field_mappings | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 1 | 0 |  |
| public.dashboard_presets | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 1 | ~420 |  |
| public.document_versions | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 2 | 0 |  |
| public.edge_health_history | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 3 | ~230 |  |
| public.energy_targets | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 2 | 0 |  |
| public.lot_quality_inspections | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 1 | 0 |  |
| public.machine_health_metrics | 0 | 24.0 KB | 0 B | 24.0 KB | 0 | 1 | 0 |  |
| public.machine_predictions | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~10 | 0 |  |
| public.maintenance_checklist_items | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 1 | 0 |  |
| public.new_device_alerts | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 2 | 0 |  |
| public.operator_goals | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~13.3k | 0 |  |
| public.operator_rankings | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 1 | ~4.5k |  |
| public.operator_skills | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 1 | 2 |  |
| public.pre_production_checklists | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 2 | 0 |  |
| public.rate_limit_settings | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 1 | 3 |  |
| public.report_templates | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 1 | 3 |  |
| public.shift_checklist_templates | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 2 | 0 |  |
| public.shift_handover_checklist | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 1 | 0 |  |
| public.shift_handovers | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 1 | 0 |  |
| public.spc_capability_history | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 1 | 0 |  |
| public.spc_control_parameters | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 1 | 0 |  |
| public.technical_conversations | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 1 | 1 |  |
| public.technical_documents | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 3 | 0 |  |
| public.technical_messages | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 1 | 0 |  |
| public.technical_sheet_favorites | 0 | 24.0 KB | 0 B | 24.0 KB | 0 | 1 | 3 |  |
| public.technical_sheet_steps | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 1 | 0 |  |
| public.technical_sheet_tips | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 1 | 0 |  |
| public.tpm_execution_alerts | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 1 | 0 |  |
| public.tpm_execution_parts | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 1 | 0 |  |
| public.tpm_execution_supplies | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 1 | 0 |  |
| public.tpm_notification_templates_published | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 1 | 0 |  |
| public.tpm_parameter_alerts | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~240 | 0 |  |
| public.tpm_severity_configs | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 1 | 0 |  |
| public.user_favorites | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 1 | ~13k |  |
| public.backup_logs | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 1 | 0 |  |
| public.bitrix24_oauth_states | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 1 | 0 |  |
| public.bitrix24_oauth_tokens | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 1 | 1 |  |
| public.chat_messages | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 1 | 0 |  |
| public.maintenance_types | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~300 | 0 |  |
| public.materials | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~300 | 0 |  |
| public.operator_achievements | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~9k | 0 |  |
| public.product_categories | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~300 | 0 |  |
| public.rls_test_results | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 2 | 0 |  |
| public.system_metrics | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 1 | 0 |  |
| public.tpm_notification_templates | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 1 | 0 |  |
| public.user_mfa_settings | 0 | 16.0 KB | 0 B | 16.0 KB | 0 | 3 | 3 |  |


## Índices nunca usados (candidatos a remoção; ignore PK/UNIQUE)

| índice | tabela | tamanho |
|---|---|---|
| idx_cron_health_history_job_time | public.cron_health_history | 2.2 MB |
| idx_telemetry_traces_trace_id | public.telemetry_traces | 216.0 KB |


## Storage

_nenhum_


## Auth (agregados)

| métrica | valor |
|---|---|
| usuários (~) | ~10 |
| confirmados (~) | ~10 |
| criados últimos 30d (~) | 1 |

| provider | usuários (~) |
|---|---|
| email | 4 |
| google | 3 |


## Consultas mais custosas (pg_stat_statements, desde o último reset)
| role | chamadas (~) | total ms (~) | média ms | query |
|---|---|---|---|---|
| postgres | ~6.8k | ~5.8M | 855.72 | `select public.snapshot_cron_health()` |
| authenticated | ~43.5k | ~3.5M | 80.23 | `WITH pgrst_source AS (INSERT INTO "public"."error_logs"("component_name", "message", "metadata", "stack", "url") SELECT "pgrst_body"."component_name", "pgrst_body"."message", "pgrst_body"."metadata", "pgrst_body"."stack"` |
| authenticated | ~8.5k | ~1M | 119.55 | `WITH pgrst_source AS ( SELECT "public"."jobs".*, row_to_json("jobs_machines_1".*)::jsonb AS "machines", row_to_json("jobs_techniques_1".*)::jsonb AS "techniques" FROM "public"."jobs" LEFT JOIN LATERAL ( SELECT "machines_` |
| postgres | ~300 | ~1M | 3419.08 | `SELECT n.nspname AS schema, c.relname AS "table", a.attnum AS position, a.attname AS name, format_type(a.atttypid, a.atttypmod) AS type, NOT a.attnotnull AS nullable, pg_get_expr(d.adbin, d.adrelid) AS "default", NULLIF(` |
| postgres | ~300 | ~975.4k | 3295.18 | `SELECT e.extname AS name, e.extversion AS version, n.nspname AS schema, (SELECT default_version FROM pg_available_extensions a WHERE a.name = e.extname) AS available_version FROM pg_extension e JOIN pg_namespace n ON n.o` |
| authenticated | ~38.1k | ~630.9k | 16.57 | `WITH pgrst_source AS ( SELECT "public"."inventory_movements".*, row_to_json("inventory_movements_profiles_1".*)::jsonb AS "profiles", row_to_json("inventory_movements_inventory_items_1".*)::jsonb AS "inventory_items" FRO` |
| authenticated | ~320 | ~628.3k | 1951.13 | `WITH pgrst_source AS (SELECT "pgrst_call".* FROM "public"."get_cron_health"() pgrst_call) SELECT $3::bigint AS total_result_set, pg_catalog.count(_postgrest_t) AS page_total, coalesce(json_agg(_postgrest_t), $4) AS body,` |
| authenticated | ~29.9k | ~599.3k | 20.04 | `WITH pgrst_source AS ( SELECT "public"."jobs".*, row_to_json("jobs_machines_1".*)::jsonb AS "machines", row_to_json("jobs_techniques_1".*)::jsonb AS "techniques" FROM "public"."jobs" LEFT JOIN LATERAL ( SELECT "machines_` |
| postgres | ~270 | ~568k | 2111.44 | `SELECT jobid, runid, status, start_time, end_time, EXTRACT($2 FROM (end_time - start_time))::numeric(10,2) AS seconds, left(return_message, $3) AS return_message FROM (SELECT *, row_number() OVER (PARTITION BY jobid ORDE` |
| authenticated | ~280 | ~542.7k | 1952.25 | `WITH pgrst_source AS ( SELECT "public"."error_logs"."id", "public"."error_logs"."created_at", "public"."error_logs"."message", "public"."error_logs"."component_name", "public"."error_logs"."url" FROM "public"."error_logs` |
| postgres | ~300 | ~500.7k | 1685.78 | `SELECT n.nspname AS schema, p.proname AS name, pg_get_function_identity_arguments(p.oid) AS args, pg_get_function_result(p.oid) AS returns, l.lanname AS language, CASE p.prokind WHEN $1 THEN $2 WHEN $3 THEN $4 WHEN $5 TH` |
| postgres | ~23.7k | ~386.7k | 16.34 | `select net.http_post(url := $1, headers := jsonb_build_object($2,$3,$4,$5), body := jsonb_build_object($6, now())) as request_id` |
| authenticated | ~38k | ~364.5k | 9.60 | `WITH pgrst_source AS ( SELECT "public"."business_config".* FROM "public"."business_config" LIMIT $1 OFFSET $2 ) SELECT $3::bigint AS total_result_set, pg_catalog.count(_postgrest_t) AS page_total, coalesce(json_agg(_post` |
| authenticated | ~25.3k | ~360.5k | 14.23 | `WITH pgrst_source AS ( SELECT "public"."inventory_items".* FROM "public"."inventory_items" ORDER BY "public"."inventory_items"."name" ASC , "public"."inventory_items"."id" ASC LIMIT $1 OFFSET $2 ) SELECT $3::bigint AS to` |
| authenticator | ~380 | ~342.1k | 902.58 | `SELECT name FROM pg_timezone_names` |


## Conexões
| usuário | estado | n |
|---|---|---|
| authenticator | idle | 11 |
| pgbouncer | idle | 1 |
| postgres | active | 1 |
| postgres | idle | 1 |
| supabase_admin | active | 1 |
| supabase_admin | idle | 7 |
| supabase_admin |  | 1 |
| supabase_auth_admin | idle | 1 |


## Saúde dos serviços
```json
[
  {
    "healthy": true,
    "info": {
      "description": "GoTrue is a user registration and authentication API",
      "name": "GoTrue",
      "version": "v2.197.0"
    },
    "name": "auth",
    "status": "ACTIVE_HEALTHY"
  },
  {
    "healthy": true,
    "name": "db",
    "status": "ACTIVE_HEALTHY"
  },
  {
    "healthy": true,
    "name": "pooler",
    "status": "ACTIVE_HEALTHY"
  },
  {
    "healthy": true,
    "info": {
      "connected_cluster": 1,
      "db_connected": true,
      "healthy": true,
      "node": "realtime@2600:1f1c:c90:ad00:bbd2:8fef:3b07:60b3",
      "region": "us-west-1",
      "replication_connected": true
    },
    "name": "realtime",
    "status": "ACTIVE_HEALTHY"
  },
  {
    "healthy": true,
    "info": {
      "db_schema": "public,graphql_public"
    },
    "name": "rest",
    "status": "ACTIVE_HEALTHY"
  },
  {
    "healthy": true,
    "name": "storage",
    "status": "ACTIVE_HEALTHY"
  }
]
```
