# Métricas (voláteis — mudam sem alteração de schema)

Valores aproximados de propósito, para não gerar commits a cada coleta. Fora de `snapshot.json`; o bruto está em `stats.json`.

## Banco

| métrica | valor |
|---|---|
| tamanho | 1.4 GB |
| schema public | 1.3 GB |
| schema app_private | 32.0 KB |


## Tabelas (ordenadas por tamanho)

| tabela | linhas (~) | total | heap | índices | linhas mortas (~) | seq scans (~) | idx scans (~) | último autovacuum |
|---|---|---|---|---|---|---|---|---|
| public.error_logs | ~3.1M | 1.3 GB | 1.2 GB | 161.0 MB | ~340 | 5 | ~1.7k | 2026-11-25 |
| public.cron_health_history | ~47.3k | 12.6 MB | 7.3 MB | 5.3 MB | ~20 | 3 | ~20.7k | 2026-11-23 |
| public.telemetry_traces | ~6.4k | 3.1 MB | 1.4 MB | 1.7 MB | ~80 | 3 | ~80 | 2026-11-25 |
| public.audit_log | ~600 | 1.9 MB | 928.0 KB | 936.0 KB | ~120 | ~230 | ~357.2k | 2026-11-23 |
| public.kpi_alerts | ~7.1k | 1.3 MB | 888.0 KB | 392.0 KB | 0 | 0 | 3 |  |
| public.push_notifications | ~1.7k | 1.1 MB | 824.0 KB | 280.0 KB | ~160 | ~110 | ~99.1k | 2026-10-30 |
| public.rate_limit_logs | ~1.1k | 760.0 KB | 544.0 KB | 176.0 KB | 0 | ~10 | ~2.4k | 2026-11-26 |
| public.jobs | ~550 | 576.0 KB | 120.0 KB | 416.0 KB | ~120 | ~91k | ~563.9k | 2026-11-23 |
| public.archived_jobs | 0 | 256.0 KB | 8.0 KB | 240.0 KB | ~30 | ~60 | ~50 |  |
| public.bitrix24_sync_history | ~500 | 240.0 KB | 128.0 KB | 80.0 KB | 0 | 3 | 1 |  |
| public.cron_p95_daily | ~550 | 232.0 KB | 96.0 KB | 96.0 KB | ~90 | ~1.5k | ~32.7k | 2026-09-10 |
| public.efficiency_alert_history | 1 | 192.0 KB | 16.0 KB | 136.0 KB | 0 | ~69.5k | ~34.8k |  |
| public.webhook_logs | 0 | 192.0 KB | 0 B | 88.0 KB | 0 | ~50 | ~50 | 2026-10-08 |
| public.csp_violation_reports | 0 | 136.0 KB | 56.0 KB | 48.0 KB | 0 | ~50 | ~110 |  |
| public.role_permissions | ~170 | 136.0 KB | 24.0 KB | 80.0 KB | 1 | ~77.5k | ~170 |  |
| public.packaging_tasks | 0 | 112.0 KB | 0 B | 88.0 KB | 0 | ~11.9k | ~22.4k | 2026-11-22 |
| public.security_events | 1 | 112.0 KB | 8.0 KB | 96.0 KB | 1 | ~1.1k | 0 |  |
| public.blocked_ips | 0 | 96.0 KB | 8.0 KB | 80.0 KB | 5 | ~10 | ~1.1k |  |
| public.job_status_audit | 3 | 96.0 KB | 8.0 KB | 48.0 KB | 0 | ~30 | 0 | 2026-11-24 |
| public.login_lockouts | 7 | 96.0 KB | 8.0 KB | 48.0 KB | 2 | ~2.3k | 8 | 2026-11-26 |
| public.user_roles | 1 | 88.0 KB | 8.0 KB | 80.0 KB | ~10 | ~51.7M | 8 |  |
| public.inventory_movements | 0 | 80.0 KB | 8.0 KB | 64.0 KB | 2 | ~84k | ~30 |  |
| public.machine_downtime | 0 | 80.0 KB | 8.0 KB | 64.0 KB | 0 | 3 | ~30 |  |
| public.packaging_defects | 0 | 80.0 KB | 8.0 KB | 64.0 KB | ~20 | ~10 | ~80 |  |
| public.password_reset_requests | 0 | 80.0 KB | 8.0 KB | 64.0 KB | 1 | 6 | 5 |  |
| public.qr_scan_history | 0 | 80.0 KB | 8.0 KB | 64.0 KB | 0 | ~1.4k | ~31.6k |  |
| public.operator_machines | 0 | 72.0 KB | 8.0 KB | 64.0 KB | 0 | ~41.3k | ~446.6k |  |
| public.energy_consumption | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | 4 | 0 |  |
| public.geo_blocking_logs | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 1 | 6 | ~50 |  |
| public.geo_blocking_rules | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 2 | 7 | ~20 |  |
| public.geo_blocking_settings | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 1 | ~760 | 4 |  |
| public.inventory_items | ~10 | 64.0 KB | 8.0 KB | 16.0 KB | 4 | ~84.1k | ~823.1k |  |
| public.job_status_history | 0 | 64.0 KB | 8.0 KB | 48.0 KB | ~20 | ~20 | ~30 |  |
| public.machine_event_audit | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | 3 | 4 |  |
| public.machines | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~107.3k | ~869.7k |  |
| public.maintenance_records | 0 | 64.0 KB | 0 B | 56.0 KB | 0 | ~3.1k | 7 |  |
| public.production_losses | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 6 | ~1.1k | ~30 |  |
| public.production_lots | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~20 | ~40 |  |
| public.push_subscriptions | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 2 | 8 | ~350.7k |  |
| public.shipments | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 9 | ~20 | ~50 |  |
| public.technical_sheets | 0 | 64.0 KB | 0 B | 56.0 KB | 0 | 3 | ~15.2k |  |
| public.techniques | 6 | 64.0 KB | 8.0 KB | 16.0 KB | 0 | ~73.2k | ~1.3M |  |
| public.user_devices | 4 | 64.0 KB | 8.0 KB | 48.0 KB | ~20 | ~110 | ~110 |  |
| public.abc_activity_rates | 4 | 56.0 KB | 8.0 KB | 48.0 KB | 0 | ~1.4k | 0 |  |
| public.ip_allowlist | 0 | 56.0 KB | 8.0 KB | 40.0 KB | 2 | ~1k | 4 |  |
| public.abc_activities | 4 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~1.4k | 0 |  |
| public.business_config | 7 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~84k | 1 |  |
| public.daily_summaries | 8 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 4 | 0 |  |
| public.dashboard_layouts | 1 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~11k | 0 |  |
| public.erp_api_keys | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 2 | ~10 | ~10 |  |
| public.feature_flags | 3 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 3 | 0 |  |
| public.new_device_alerts | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 4 | 0 |  |
| public.tpm_executions | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | 3 | 4 |  |
| public.user_notification_settings | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 3 | ~1k |  |
| public.lot_components | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | 3 | 0 |  |
| public.packaging_sla_overrides | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~31.8k | 0 |  |
| public.shift_occurrences | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | 4 | ~20 |  |
| public.shift_pending_tasks | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | 4 | ~20 |  |
| public.spc_measurements | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | 3 | ~30 |  |
| public.tpm_notification_queue | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~30 | 0 |  |
| app_private.runtime_config | 0 | 32.0 KB | 8.0 KB | 16.0 KB | ~10 | 6 | ~41.4k |  |
| public.abc_cost_pools | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | ~1.4k | 0 |  |
| public.abc_job_costs | 0 | 32.0 KB | 0 B | 32.0 KB | 0 | ~1.4k | ~30 |  |
| public.energy_alerts | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 4 | 0 |  |
| public.gamification_rewards | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | ~11.1k | 0 |  |
| public.login_audit | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 3 | ~1.1k |  |
| public.lot_movements | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 4 | ~20 |  |
| public.maintenance_alerts | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~680 | 0 |  |
| public.maintenance_checklists | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~670 | 0 |  |
| public.maintenance_item_responses | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 3 | 0 |  |
| public.maintenance_schedules | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~680 | 0 |  |
| public.operator_status_audit | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 4 | 0 |  |
| public.packaging_checklist_items | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 3 | 0 |  |
| public.packaging_settings | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | ~31.8k | 0 |  |
| public.packaging_task_checklist | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 7 | ~10 |  |
| public.prediction_history | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~20 | 0 |  |
| public.profiles | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 4 | ~92.3k | ~248k |  |
| public.query_telemetry | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 7 | ~2.7k |  |
| public.reward_redemptions | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 3 | ~20.7k |  |
| public.shipping_providers | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | ~570 | 0 |  |
| public.spc_alerts | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 3 | 0 |  |
| public.system_metrics | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 8 | 0 |  |
| public.technical_sheet_audit | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 3 | 4 |  |
| public.technical_sheet_audit_logs | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 3 | 4 |  |
| public.technical_sheet_materials | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 3 | 0 |  |
| public.technical_sheet_versions | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 3 | 4 |  |
| public.tpm_execution_audit_logs | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 3 | 4 |  |
| public.tpm_notification_logs | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 6 | 4 |  |
| public.bitrix24_field_mappings | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 3 | 0 |  |
| public.dashboard_presets | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 3 | ~1.1k |  |
| public.document_versions | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 4 | 0 |  |
| public.edge_health_history | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 9 | ~570 |  |
| public.energy_targets | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 4 | 0 |  |
| public.lot_quality_inspections | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 3 | 0 |  |
| public.machine_health_metrics | 0 | 24.0 KB | 0 B | 24.0 KB | 0 | 4 | 0 |  |
| public.machine_predictions | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 0 |  |
| public.maintenance_checklist_items | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 3 | 0 |  |
| public.operator_goals | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~31.9k | 0 |  |
| public.operator_rankings | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 3 | ~11.1k |  |
| public.operator_skills | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 3 | 3 |  |
| public.pre_production_checklists | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 4 | ~20 |  |
| public.rate_limit_settings | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 3 | 4 |  |
| public.report_templates | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 3 | 4 |  |
| public.shift_checklist_templates | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 4 | 0 |  |
| public.shift_handover_checklist | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 3 | 0 |  |
| public.shift_handovers | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 3 | 0 |  |
| public.spc_capability_history | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 3 | 0 |  |
| public.spc_control_parameters | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 3 | 0 |  |
| public.technical_conversations | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 3 | 1 |  |
| public.technical_documents | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 5 | 0 |  |
| public.technical_messages | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 3 | 0 |  |
| public.technical_sheet_favorites | 0 | 24.0 KB | 0 B | 24.0 KB | 0 | 3 | 4 |  |
| public.technical_sheet_steps | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 3 | 0 |  |
| public.technical_sheet_tips | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 3 | 0 |  |
| public.tpm_execution_alerts | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 3 | 0 |  |
| public.tpm_execution_parts | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 3 | 0 |  |
| public.tpm_execution_supplies | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 3 | 0 |  |
| public.tpm_notification_templates_published | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 3 | 0 |  |
| public.tpm_parameter_alerts | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~620 | 0 |  |
| public.tpm_severity_configs | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 3 | 0 |  |
| public.user_favorites | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 3 | ~31.6k |  |
| public.backup_logs | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 3 | 0 |  |
| public.bitrix24_oauth_states | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 3 | 0 |  |
| public.bitrix24_oauth_tokens | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 3 | 1 |  |
| public.chat_messages | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 3 | 0 |  |
| public.maintenance_types | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~670 | 0 |  |
| public.materials | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~670 | 0 |  |
| public.operator_achievements | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~22.2k | 0 |  |
| public.product_categories | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~670 | 0 |  |
| public.rls_test_results | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 4 | 0 |  |
| public.tpm_notification_templates | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 3 | 0 |  |
| public.user_mfa_settings | 0 | 16.0 KB | 0 B | 16.0 KB | 0 | 5 | 4 |  |


## Índices nunca usados (candidatos a remoção; ignore PK/UNIQUE)

| índice | tabela | tamanho |
|---|---|---|
| idx_audit_log_entity | public.audit_log | 104.0 KB |
| idx_audit_log_entity_created | public.audit_log | 104.0 KB |
| idx_telemetry_traces_trace_id | public.telemetry_traces | 496.0 KB |


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
| email | 5 |
| google | 3 |


## Consultas mais custosas (pg_stat_statements, desde o último reset)
| role | chamadas (~) | total ms (~) | média ms | query |
|---|---|---|---|---|
| postgres | ~8.1k | ~10.9M | 1339.61 | `select public.snapshot_cron_health()` |
| authenticated | ~94.1k | ~9.2M | 98.30 | `WITH pgrst_source AS (INSERT INTO "public"."error_logs"("component_name", "message", "metadata", "stack", "url") SELECT "pgrst_body"."component_name", "pgrst_body"."message", "pgrst_body"."metadata", "pgrst_body"."stack"` |
| authenticated | ~38k | ~5.2M | 137.36 | `WITH pgrst_source AS ( SELECT "public"."jobs".*, row_to_json("jobs_machines_1".*)::jsonb AS "machines", row_to_json("jobs_techniques_1".*)::jsonb AS "techniques" FROM "public"."jobs" LEFT JOIN LATERAL ( SELECT "machines_` |
| authenticated | ~16.2k | ~3.6M | 220.51 | `WITH pgrst_source AS ( SELECT "public"."jobs".*, row_to_json("jobs_machines_1".*)::jsonb AS "machines", row_to_json("jobs_techniques_1".*)::jsonb AS "techniques" FROM "public"."jobs" LEFT JOIN LATERAL ( SELECT "machines_` |
| authenticated | ~710 | ~2.9M | 4058.23 | `WITH pgrst_source AS (SELECT "pgrst_call".* FROM "public"."get_cron_health"() pgrst_call) SELECT $3::bigint AS total_result_set, pg_catalog.count(_postgrest_t) AS page_total, coalesce(json_agg(_postgrest_t), $4) AS body,` |
| authenticated | ~16k | ~2.7M | 171.05 | `WITH pgrst_source AS ( SELECT "public"."jobs".*, row_to_json("jobs_machines_1".*)::jsonb AS "machines", row_to_json("jobs_techniques_1".*)::jsonb AS "techniques" FROM "public"."jobs" LEFT JOIN LATERAL ( SELECT "machines_` |
| authenticated | ~7.6k | ~2.1M | 277.86 | `WITH pgrst_source AS ( SELECT "public"."jobs".*, row_to_json("jobs_machines_1".*)::jsonb AS "machines", row_to_json("jobs_techniques_1".*)::jsonb AS "techniques" FROM "public"."jobs" LEFT JOIN LATERAL ( SELECT "machines_` |
| postgres | ~820 | ~2M | 2388.54 | `SELECT jobid, runid, status, start_time, end_time, EXTRACT($2 FROM (end_time - start_time))::numeric(10,2) AS seconds, left(return_message, $3) AS return_message FROM (SELECT *, row_number() OVER (PARTITION BY jobid ORDE` |
| authenticated | ~84k | ~1.6M | 18.64 | `WITH pgrst_source AS ( SELECT "public"."inventory_movements".*, row_to_json("inventory_movements_profiles_1".*)::jsonb AS "profiles", row_to_json("inventory_movements_inventory_items_1".*)::jsonb AS "inventory_items" FRO` |
| postgres | ~850 | ~1.4M | 1642.51 | `SELECT n.nspname AS schema, c.relname AS "table", a.attnum AS position, a.attname AS name, format_type(a.atttypid, a.atttypmod) AS type, NOT a.attnotnull AS nullable, pg_get_expr(d.adbin, d.adrelid) AS "default", NULLIF(` |
| postgres | ~860 | ~1.4M | 1629.02 | `SELECT e.extname AS name, e.extversion AS version, n.nspname AS schema, (SELECT default_version FROM pg_available_extensions a WHERE a.name = e.extname) AS available_version FROM pg_extension e JOIN pg_namespace n ON n.o` |
| authenticated | ~16.7k | ~1.4M | 82.90 | `WITH pgrst_source AS ( SELECT "public"."jobs".* FROM "public"."jobs" ORDER BY "public"."jobs"."created_at" DESC LIMIT $1 OFFSET $2 ) SELECT $3::bigint AS total_result_set, pg_catalog.count(_postgrest_t) AS page_total, co` |
| authenticated | ~84k | ~981.5k | 11.69 | `WITH pgrst_source AS ( SELECT "public"."business_config".* FROM "public"."business_config" LIMIT $1 OFFSET $2 ) SELECT $3::bigint AS total_result_set, pg_catalog.count(_postgrest_t) AS page_total, coalesce(json_agg(_post` |
| authenticated | ~360 | ~979k | 2757.84 | `WITH pgrst_source AS ( SELECT "public"."error_logs"."id", "public"."error_logs"."created_at", "public"."error_logs"."message", "public"."error_logs"."component_name", "public"."error_logs"."url" FROM "public"."error_logs` |
| authenticated | ~71.3k | ~973.4k | 13.65 | `WITH pgrst_source AS ( SELECT "public"."inventory_items".* FROM "public"."inventory_items" ORDER BY "public"."inventory_items"."name" ASC , "public"."inventory_items"."id" ASC LIMIT $1 OFFSET $2 ) SELECT $3::bigint AS to` |


## Conexões
| usuário | estado | n |
|---|---|---|
| authenticator | idle | 2 |
| pgbouncer | idle | 2 |
| postgres | active | 1 |
| postgres | idle | 1 |
| supabase_admin | idle | 2 |
| supabase_admin |  | 1 |
| supabase_storage_admin | idle | 1 |


## Saúde dos serviços
```json
[
  {
    "healthy": true,
    "info": {
      "description": "GoTrue is a user registration and authentication API",
      "name": "GoTrue",
      "version": "v2.199.0"
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
      "db_connected": false,
      "healthy": true,
      "node": "realtime@2600:1f1c:c90:ad01:665c:291b:b45c:e0c0",
      "region": "us-west-1",
      "replication_connected": false
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
