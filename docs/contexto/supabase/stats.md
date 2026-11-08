# Métricas (voláteis — mudam sem alteração de schema)

Valores aproximados de propósito, para não gerar commits a cada coleta. Fora de `snapshot.json`; o bruto está em `stats.json`.

## Banco

| métrica | valor |
|---|---|
| tamanho | 282.9 MB |
| schema public | 237.0 MB |
| schema app_private | 32.0 KB |


## Tabelas (ordenadas por tamanho)

| tabela | linhas (~) | total | heap | índices | linhas mortas (~) | seq scans (~) | idx scans (~) | último autovacuum |
|---|---|---|---|---|---|---|---|---|
| public.error_logs | ~474.1k | 217.0 MB | 191.3 MB | 25.6 MB | 0 | 1 | ~390 | 2026-11-08 |
| public.cron_health_history | ~34.3k | 10.5 MB | 6.0 MB | 4.5 MB | 0 | 1 | ~15.5k | 2026-11-07 |
| public.kpi_alerts | ~7.1k | 1.3 MB | 888.0 KB | 392.0 KB | 0 | 0 | 1 |  |
| public.telemetry_traces | ~1.2k | 1.1 MB | 408.0 KB | 720.0 KB | 0 | 1 | ~50 | 2026-11-08 |
| public.push_notifications | ~1.3k | 904.0 KB | 608.0 KB | 256.0 KB | 0 | ~90 | ~37.7k | 2026-10-30 |
| public.audit_log | ~120 | 696.0 KB | 360.0 KB | 280.0 KB | ~40 | ~140 | ~159.8k | 2026-11-08 |
| public.jobs | ~110 | 368.0 KB | 88.0 KB | 240.0 KB | ~40 | ~72.9k | ~232k | 2026-11-08 |
| public.bitrix24_sync_history | ~500 | 240.0 KB | 128.0 KB | 80.0 KB | 0 | 1 | 1 |  |
| public.cron_p95_daily | ~440 | 208.0 KB | 72.0 KB | 96.0 KB | ~70 | ~1.5k | ~31.5k | 2026-09-10 |
| public.efficiency_alert_history | 1 | 192.0 KB | 16.0 KB | 136.0 KB | 0 | ~21.8k | ~10.9k |  |
| public.webhook_logs | 0 | 192.0 KB | 0 B | 88.0 KB | 0 | ~30 | ~30 | 2026-10-08 |
| public.archived_jobs | 0 | 128.0 KB | 0 B | 120.0 KB | 0 | ~20 | 0 |  |
| public.security_events | 1 | 112.0 KB | 8.0 KB | 96.0 KB | 0 | ~320 | 0 |  |
| public.role_permissions | 7 | 96.0 KB | 8.0 KB | 80.0 KB | 0 | ~26.9k | 0 |  |
| public.user_roles | 1 | 88.0 KB | 8.0 KB | 80.0 KB | 5 | ~8.5M | 4 |  |
| public.inventory_movements | 0 | 80.0 KB | 8.0 KB | 64.0 KB | 0 | ~29.5k | 1 |  |
| public.job_status_audit | 0 | 80.0 KB | 8.0 KB | 48.0 KB | ~40 | 4 | 0 | 2026-11-08 |
| public.machine_downtime | 0 | 80.0 KB | 8.0 KB | 64.0 KB | 0 | 1 | 2 |  |
| public.qr_scan_history | 0 | 80.0 KB | 8.0 KB | 64.0 KB | 0 | ~440 | ~10.4k |  |
| public.operator_machines | 0 | 72.0 KB | 8.0 KB | 64.0 KB | 0 | ~14.3k | ~197.3k |  |
| public.energy_consumption | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | 1 | 0 |  |
| public.inventory_items | ~10 | 64.0 KB | 8.0 KB | 16.0 KB | 0 | ~29.5k | ~277.8k |  |
| public.job_status_history | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | 1 | 3 |  |
| public.login_lockouts | 2 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | 1 | 0 |  |
| public.machine_event_audit | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | 1 | 3 |  |
| public.machines | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~34.8k | ~347.6k |  |
| public.maintenance_records | 0 | 64.0 KB | 0 B | 56.0 KB | 0 | ~1k | 5 |  |
| public.production_lots | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | 1 | 0 |  |
| public.technical_sheets | 0 | 64.0 KB | 0 B | 56.0 KB | 0 | 1 | ~4.9k |  |
| public.techniques | 6 | 64.0 KB | 8.0 KB | 16.0 KB | 0 | ~23.5k | ~679.3k |  |
| public.abc_activity_rates | 4 | 56.0 KB | 8.0 KB | 48.0 KB | 0 | ~430 | 0 |  |
| public.packaging_tasks | 0 | 56.0 KB | 0 B | 48.0 KB | 0 | 3 | ~9.4k |  |
| public.abc_activities | 4 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~430 | 0 |  |
| public.blocked_ips | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | 1 | 6 |  |
| public.business_config | 7 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~29.4k | 1 |  |
| public.daily_summaries | 8 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 2 | 0 |  |
| public.dashboard_layouts | 1 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~3.8k | 0 |  |
| public.feature_flags | 3 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 1 | 0 |  |
| public.tpm_executions | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | 1 | 3 |  |
| public.user_notification_settings | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 1 | ~280 |  |
| public.lot_components | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | 1 | 0 |  |
| public.packaging_sla_overrides | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~10.6k | 0 |  |
| public.password_reset_requests | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | 1 | 3 |  |
| public.rate_limit_logs | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | 1 | ~40 |  |
| public.shift_occurrences | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | 2 | 0 |  |
| public.shift_pending_tasks | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | 2 | 0 |  |
| public.spc_measurements | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | 1 | 0 |  |
| public.tpm_notification_queue | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | 4 | 0 |  |
| app_private.runtime_config | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 6 | 1 | ~27.1k |  |
| public.abc_cost_pools | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | ~430 | 0 |  |
| public.abc_job_costs | 0 | 32.0 KB | 0 B | 32.0 KB | 0 | ~430 | 3 |  |
| public.csp_violation_reports | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~10 | ~30 |  |
| public.energy_alerts | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 2 | 0 |  |
| public.gamification_rewards | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | ~3.8k | 0 |  |
| public.geo_blocking_logs | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 2 | ~30 |  |
| public.geo_blocking_rules | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 1 | 3 |  |
| public.geo_blocking_settings | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 4 | 3 |  |
| public.ip_allowlist | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 2 | 3 |  |
| public.login_audit | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 1 | ~320 |  |
| public.lot_movements | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 2 | 0 |  |
| public.maintenance_alerts | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~230 | 0 |  |
| public.maintenance_checklists | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~230 | 0 |  |
| public.maintenance_item_responses | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 1 | 0 |  |
| public.maintenance_schedules | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~230 | 0 |  |
| public.operator_status_audit | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 2 | 0 |  |
| public.packaging_checklist_items | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 1 | 0 |  |
| public.packaging_defects | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 4 | 0 |  |
| public.packaging_settings | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | ~10.6k | 0 |  |
| public.packaging_task_checklist | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 4 | 0 |  |
| public.prediction_history | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~10 | 0 |  |
| public.production_losses | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~350 | 2 |  |
| public.profiles | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 3 | ~32.8k | ~93k |  |
| public.push_subscriptions | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 1 | ~130.4k |  |
| public.query_telemetry | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 3 | ~740 |  |
| public.reward_redemptions | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 1 | ~7.2k |  |
| public.shipments | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 1 | 0 |  |
| public.shipping_providers | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | ~160 | 0 |  |
| public.spc_alerts | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 1 | 0 |  |
| public.technical_sheet_audit | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 1 | 3 |  |
| public.technical_sheet_audit_logs | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 1 | 3 |  |
| public.technical_sheet_materials | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 1 | 0 |  |
| public.technical_sheet_versions | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 1 | 3 |  |
| public.tpm_execution_audit_logs | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 1 | 3 |  |
| public.tpm_notification_logs | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 1 | 3 |  |
| public.user_devices | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 1 | 1 |  |
| public.bitrix24_field_mappings | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 1 | 0 |  |
| public.dashboard_presets | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 1 | ~350 |  |
| public.document_versions | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 2 | 0 |  |
| public.edge_health_history | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 3 | ~200 |  |
| public.energy_targets | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 2 | 0 |  |
| public.lot_quality_inspections | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 1 | 0 |  |
| public.machine_health_metrics | 0 | 24.0 KB | 0 B | 24.0 KB | 0 | 1 | 0 |  |
| public.machine_predictions | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~10 | 0 |  |
| public.maintenance_checklist_items | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 1 | 0 |  |
| public.new_device_alerts | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 2 | 0 |  |
| public.operator_goals | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~10.8k | 0 |  |
| public.operator_rankings | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 1 | ~3.8k |  |
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
| public.tpm_parameter_alerts | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~180 | 0 |  |
| public.tpm_severity_configs | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 1 | 0 |  |
| public.user_favorites | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 1 | ~10.5k |  |
| public.backup_logs | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 1 | 0 |  |
| public.bitrix24_oauth_states | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 1 | 0 |  |
| public.bitrix24_oauth_tokens | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 1 | 1 |  |
| public.chat_messages | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 1 | 0 |  |
| public.maintenance_types | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~230 | 0 |  |
| public.materials | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~230 | 0 |  |
| public.operator_achievements | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~7.6k | 0 |  |
| public.product_categories | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~230 | 0 |  |
| public.rls_test_results | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 2 | 0 |  |
| public.system_metrics | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 1 | 0 |  |
| public.tpm_notification_templates | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 1 | 0 |  |
| public.user_mfa_settings | 0 | 16.0 KB | 0 B | 16.0 KB | 0 | 3 | 3 |  |


## Índices nunca usados (candidatos a remoção; ignore PK/UNIQUE)

| índice | tabela | tamanho |
|---|---|---|
| idx_cron_health_history_job_time | public.cron_health_history | 2.1 MB |
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
| postgres | ~6.6k | ~5.3M | 805.65 | `select public.snapshot_cron_health()` |
| authenticated | ~30.2k | ~993.4k | 32.91 | `WITH pgrst_source AS (INSERT INTO "public"."error_logs"("component_name", "message", "metadata", "stack", "url") SELECT "pgrst_body"."component_name", "pgrst_body"."message", "pgrst_body"."metadata", "pgrst_body"."stack"` |
| authenticated | ~29.7k | ~588.2k | 19.81 | `WITH pgrst_source AS ( SELECT "public"."jobs".*, row_to_json("jobs_machines_1".*)::jsonb AS "machines", row_to_json("jobs_techniques_1".*)::jsonb AS "techniques" FROM "public"."jobs" LEFT JOIN LATERAL ( SELECT "machines_` |
| authenticated | ~270 | ~487k | 1810.36 | `WITH pgrst_source AS ( SELECT "public"."error_logs"."id", "public"."error_logs"."created_at", "public"."error_logs"."message", "public"."error_logs"."component_name", "public"."error_logs"."url" FROM "public"."error_logs` |
| authenticated | ~270 | ~407.9k | 1527.58 | `WITH pgrst_source AS (SELECT "pgrst_call".* FROM "public"."get_cron_health"() pgrst_call) SELECT $3::bigint AS total_result_set, pg_catalog.count(_postgrest_t) AS page_total, coalesce(json_agg(_postgrest_t), $4) AS body,` |
| postgres | ~22.9k | ~344.6k | 15.02 | `select net.http_post(url := $1, headers := jsonb_build_object($2,$3,$4,$5), body := jsonb_build_object($6, now())) as request_id` |
| authenticated | ~29.5k | ~335.8k | 11.39 | `WITH pgrst_source AS ( SELECT "public"."inventory_movements".*, row_to_json("inventory_movements_profiles_1".*)::jsonb AS "profiles", row_to_json("inventory_movements_inventory_items_1".*)::jsonb AS "inventory_items" FRO` |
| authenticator | ~370 | ~322.2k | 875.48 | `SELECT name FROM pg_timezone_names` |
| authenticated | ~10.9k | ~299.1k | 27.45 | `WITH pgrst_source AS ( SELECT "public"."jobs".*, row_to_json("jobs_machines_1".*)::jsonb AS "machines", row_to_json("jobs_techniques_1".*)::jsonb AS "techniques" FROM "public"."jobs" LEFT JOIN LATERAL ( SELECT "machines_` |
| authenticated | ~12.5k | ~257.1k | 20.62 | `WITH pgrst_source AS ( SELECT "public"."jobs".* FROM "public"."jobs" ORDER BY "public"."jobs"."created_at" DESC LIMIT $1 OFFSET $2 ) SELECT $3::bigint AS total_result_set, pg_catalog.count(_postgrest_t) AS page_total, co` |
| authenticated | ~29.4k | ~206k | 7.02 | `WITH pgrst_source AS ( SELECT "public"."business_config".* FROM "public"."business_config" LIMIT $1 OFFSET $2 ) SELECT $3::bigint AS total_result_set, pg_catalog.count(_postgrest_t) AS page_total, coalesce(json_agg(_post` |
| postgres | ~9k | ~155.6k | 17.26 | `SELECT net.http_post( url := (SELECT value FROM app_private.runtime_config WHERE key = $1) \|\| $2, headers := jsonb_build_object( $3, $4, $5, $6 \|\| coalesce((SELECT value FROM app_private.runtime_config WHERE key = $7), $` |
| postgres | ~10.3k | ~134.5k | 13.02 | `select net.http_post(url := $1, headers := jsonb_build_object($2,$3,$4,$5), body := $6::jsonb) as request_id` |
| authenticated | ~16.7k | ~129.1k | 7.71 | `WITH pgrst_source AS ( SELECT "public"."inventory_items".* FROM "public"."inventory_items" ORDER BY "public"."inventory_items"."name" ASC , "public"."inventory_items"."id" ASC LIMIT $1 OFFSET $2 ) SELECT $3::bigint AS to` |
| postgres | ~1.4k | ~129k | 95.30 | `SELECT public.rollup_cron_p95_daily($1)` |


## Conexões
| usuário | estado | n |
|---|---|---|
| authenticator | idle | 11 |
| pgbouncer | idle | 1 |
| postgres | active | 1 |
| postgres | idle | 1 |
| supabase_admin | active | 1 |
| supabase_admin | idle | 8 |
| supabase_admin |  | 1 |


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
      "connected_cluster": 0,
      "db_connected": true,
      "healthy": true,
      "node": "realtime@2600:1f18:67fc:ac00:533f:4537:b00e:f54a",
      "region": "us-east-1",
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
