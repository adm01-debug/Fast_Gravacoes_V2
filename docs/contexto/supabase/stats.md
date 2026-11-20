# Métricas (voláteis — mudam sem alteração de schema)

Valores aproximados de propósito, para não gerar commits a cada coleta. Fora de `snapshot.json`; o bruto está em `stats.json`.

## Banco

| métrica | valor |
|---|---|
| tamanho | 876.2 MB |
| schema public | 822.0 MB |
| schema app_private | 32.0 KB |


## Tabelas (ordenadas por tamanho)

| tabela | linhas (~) | total | heap | índices | linhas mortas (~) | seq scans (~) | idx scans (~) | último autovacuum |
|---|---|---|---|---|---|---|---|---|
| public.error_logs | ~1.7M | 799.4 MB | 704.7 MB | 94.5 MB | ~260 | 1 | ~760 | 2026-11-19 |
| public.cron_health_history | ~42.7k | 11.8 MB | 6.7 MB | 5.0 MB | ~10 | 3 | ~18.4k | 2026-11-07 |
| public.telemetry_traces | ~2.6k | 1.5 MB | 624.0 KB | 848.0 KB | 0 | 3 | ~70 | 2026-11-20 |
| public.kpi_alerts | ~7.1k | 1.3 MB | 888.0 KB | 392.0 KB | 0 | 0 | 3 |  |
| public.audit_log | ~310 | 1.1 MB | 680.0 KB | 424.0 KB | ~50 | ~180 | ~287.5k | 2026-11-20 |
| public.push_notifications | ~1.5k | 984.0 KB | 672.0 KB | 272.0 KB | ~10 | ~100 | ~62.8k | 2026-10-30 |
| public.jobs | ~300 | 464.0 KB | 88.0 KB | 336.0 KB | ~110 | ~83k | ~438.9k | 2026-11-20 |
| public.bitrix24_sync_history | ~500 | 240.0 KB | 128.0 KB | 80.0 KB | 0 | 3 | 1 |  |
| public.cron_p95_daily | ~520 | 224.0 KB | 88.0 KB | 96.0 KB | ~80 | ~1.5k | ~32.1k | 2026-09-10 |
| public.efficiency_alert_history | 1 | 192.0 KB | 16.0 KB | 136.0 KB | 0 | ~40.6k | ~20.3k |  |
| public.webhook_logs | 0 | 192.0 KB | 0 B | 88.0 KB | 0 | ~50 | ~40 | 2026-10-08 |
| public.archived_jobs | 0 | 128.0 KB | 0 B | 120.0 KB | 0 | ~20 | 0 |  |
| public.csp_violation_reports | 0 | 120.0 KB | 40.0 KB | 48.0 KB | 0 | ~40 | ~100 |  |
| public.rate_limit_logs | ~110 | 112.0 KB | 16.0 KB | 64.0 KB | 0 | ~10 | ~230 |  |
| public.security_events | 1 | 112.0 KB | 8.0 KB | 96.0 KB | 0 | ~620 | 0 |  |
| public.blocked_ips | 0 | 96.0 KB | 8.0 KB | 80.0 KB | 2 | 6 | ~10 |  |
| public.role_permissions | 7 | 96.0 KB | 8.0 KB | 80.0 KB | 0 | ~48.1k | 0 |  |
| public.user_roles | 1 | 88.0 KB | 8.0 KB | 80.0 KB | 7 | ~21.2M | 6 |  |
| public.inventory_movements | 0 | 80.0 KB | 8.0 KB | 64.0 KB | 2 | ~53.2k | 3 |  |
| public.job_status_audit | 0 | 80.0 KB | 8.0 KB | 48.0 KB | ~50 | 6 | 0 | 2026-11-20 |
| public.machine_downtime | 0 | 80.0 KB | 8.0 KB | 64.0 KB | 0 | 3 | 2 |  |
| public.password_reset_requests | 0 | 80.0 KB | 8.0 KB | 64.0 KB | 1 | 5 | 3 |  |
| public.qr_scan_history | 0 | 80.0 KB | 8.0 KB | 64.0 KB | 0 | ~880 | ~18.6k |  |
| public.operator_machines | 0 | 72.0 KB | 8.0 KB | 64.0 KB | 0 | ~24.4k | ~348.5k |  |
| public.energy_consumption | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | 3 | 0 |  |
| public.inventory_items | ~10 | 64.0 KB | 8.0 KB | 16.0 KB | 4 | ~53.2k | ~514.5k |  |
| public.job_status_history | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | 3 | 3 |  |
| public.login_lockouts | 2 | 64.0 KB | 8.0 KB | 48.0 KB | 4 | ~40 | 0 |  |
| public.machine_event_audit | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | 3 | 3 |  |
| public.machines | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | ~63.3k | ~565.1k |  |
| public.maintenance_records | 0 | 64.0 KB | 0 B | 56.0 KB | 0 | ~1.9k | 5 |  |
| public.production_lots | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 0 | 3 | 0 |  |
| public.technical_sheets | 0 | 64.0 KB | 0 B | 56.0 KB | 0 | 3 | ~9k |  |
| public.techniques | 6 | 64.0 KB | 8.0 KB | 16.0 KB | 0 | ~43.1k | ~945.1k |  |
| public.user_devices | 0 | 64.0 KB | 8.0 KB | 48.0 KB | 3 | 3 | 9 |  |
| public.abc_activity_rates | 4 | 56.0 KB | 8.0 KB | 48.0 KB | 0 | ~870 | 0 |  |
| public.packaging_tasks | 0 | 56.0 KB | 0 B | 48.0 KB | 0 | 7 | ~19.8k |  |
| public.abc_activities | 4 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~870 | 0 |  |
| public.business_config | 7 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~53.1k | 1 |  |
| public.daily_summaries | 8 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 4 | 0 |  |
| public.dashboard_layouts | 1 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | ~6.3k | 0 |  |
| public.feature_flags | 3 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 3 | 0 |  |
| public.new_device_alerts | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 4 | 0 |  |
| public.tpm_executions | 0 | 48.0 KB | 0 B | 40.0 KB | 0 | 3 | 3 |  |
| public.user_notification_settings | 0 | 48.0 KB | 8.0 KB | 32.0 KB | 0 | 3 | ~570 |  |
| public.lot_components | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | 3 | 0 |  |
| public.packaging_sla_overrides | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~18.9k | 0 |  |
| public.shift_occurrences | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | 4 | 0 |  |
| public.shift_pending_tasks | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | 4 | 0 |  |
| public.spc_measurements | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | 3 | 0 |  |
| public.tpm_notification_queue | 0 | 40.0 KB | 0 B | 32.0 KB | 0 | ~10 | 0 |  |
| app_private.runtime_config | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 9 | 1 | ~36.8k |  |
| public.abc_cost_pools | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | ~870 | 0 |  |
| public.abc_job_costs | 0 | 32.0 KB | 0 B | 32.0 KB | 0 | ~870 | 3 |  |
| public.energy_alerts | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 4 | 0 |  |
| public.gamification_rewards | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | ~6.4k | 0 |  |
| public.geo_blocking_logs | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 4 | ~40 |  |
| public.geo_blocking_rules | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 3 | 3 |  |
| public.geo_blocking_settings | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 6 | 3 |  |
| public.ip_allowlist | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 4 | 3 |  |
| public.login_audit | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 3 | ~610 |  |
| public.lot_movements | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 4 | 0 |  |
| public.maintenance_alerts | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~430 | 0 |  |
| public.maintenance_checklists | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~430 | 0 |  |
| public.maintenance_item_responses | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 3 | 0 |  |
| public.maintenance_schedules | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~430 | 0 |  |
| public.operator_status_audit | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 4 | 0 |  |
| public.packaging_checklist_items | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | 3 | 0 |  |
| public.packaging_defects | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 6 | 0 |  |
| public.packaging_settings | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | ~18.9k | 0 |  |
| public.packaging_task_checklist | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 6 | 0 |  |
| public.prediction_history | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~10 | 0 |  |
| public.production_losses | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | ~620 | 2 |  |
| public.profiles | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 3 | ~58.2k | ~162.9k |  |
| public.push_subscriptions | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 3 | ~232.4k |  |
| public.query_telemetry | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 5 | ~1.5k |  |
| public.reward_redemptions | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 3 | ~11.8k |  |
| public.shipments | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 5 | 1 |  |
| public.shipping_providers | 0 | 32.0 KB | 8.0 KB | 16.0 KB | 0 | ~330 | 0 |  |
| public.spc_alerts | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 3 | 0 |  |
| public.technical_sheet_audit | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 3 | 3 |  |
| public.technical_sheet_audit_logs | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 3 | 3 |  |
| public.technical_sheet_materials | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 3 | 0 |  |
| public.technical_sheet_versions | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 3 | 3 |  |
| public.tpm_execution_audit_logs | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 3 | 3 |  |
| public.tpm_notification_logs | 0 | 32.0 KB | 0 B | 24.0 KB | 0 | 3 | 3 |  |
| public.bitrix24_field_mappings | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 3 | 0 |  |
| public.dashboard_presets | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 3 | ~620 |  |
| public.document_versions | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 4 | 0 |  |
| public.edge_health_history | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 7 | ~340 |  |
| public.energy_targets | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 4 | 0 |  |
| public.lot_quality_inspections | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 3 | 0 |  |
| public.machine_health_metrics | 0 | 24.0 KB | 0 B | 24.0 KB | 0 | 3 | 0 |  |
| public.machine_predictions | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~20 | 0 |  |
| public.maintenance_checklist_items | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 3 | 0 |  |
| public.operator_goals | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~19k | 0 |  |
| public.operator_rankings | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 3 | ~6.4k |  |
| public.operator_skills | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 3 | 2 |  |
| public.pre_production_checklists | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 4 | 0 |  |
| public.rate_limit_settings | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 3 | 3 |  |
| public.report_templates | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 3 | 3 |  |
| public.shift_checklist_templates | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 4 | 0 |  |
| public.shift_handover_checklist | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 3 | 0 |  |
| public.shift_handovers | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 3 | 0 |  |
| public.spc_capability_history | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 3 | 0 |  |
| public.spc_control_parameters | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 3 | 0 |  |
| public.technical_conversations | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 3 | 1 |  |
| public.technical_documents | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 5 | 0 |  |
| public.technical_messages | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 3 | 0 |  |
| public.technical_sheet_favorites | 0 | 24.0 KB | 0 B | 24.0 KB | 0 | 3 | 3 |  |
| public.technical_sheet_steps | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 3 | 0 |  |
| public.technical_sheet_tips | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 3 | 0 |  |
| public.tpm_execution_alerts | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 3 | 0 |  |
| public.tpm_execution_parts | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 3 | 0 |  |
| public.tpm_execution_supplies | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 3 | 0 |  |
| public.tpm_notification_templates_published | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 3 | 0 |  |
| public.tpm_parameter_alerts | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | ~370 | 0 |  |
| public.tpm_severity_configs | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 3 | 0 |  |
| public.user_favorites | 0 | 24.0 KB | 0 B | 16.0 KB | 0 | 3 | ~18.7k |  |
| public.backup_logs | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 3 | 0 |  |
| public.bitrix24_oauth_states | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 3 | 0 |  |
| public.bitrix24_oauth_tokens | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 3 | 1 |  |
| public.chat_messages | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 3 | 0 |  |
| public.maintenance_types | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~430 | 0 |  |
| public.materials | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~430 | 0 |  |
| public.operator_achievements | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~12.7k | 0 |  |
| public.product_categories | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | ~430 | 0 |  |
| public.rls_test_results | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 4 | 0 |  |
| public.system_metrics | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 3 | 0 |  |
| public.tpm_notification_templates | 0 | 16.0 KB | 0 B | 8.0 KB | 0 | 3 | 0 |  |
| public.user_mfa_settings | 0 | 16.0 KB | 0 B | 16.0 KB | 0 | 5 | 3 |  |


## Índices nunca usados (candidatos a remoção; ignore PK/UNIQUE)

| índice | tabela | tamanho |
|---|---|---|
| audit_log_actor_idx | public.audit_log | 80.0 KB |
| audit_log_entity_idx | public.audit_log | 72.0 KB |
| idx_audit_log_entity | public.audit_log | 72.0 KB |
| idx_audit_log_entity_created | public.audit_log | 72.0 KB |
| idx_cron_health_history_job_time | public.cron_health_history | 2.5 MB |
| idx_telemetry_traces_trace_id | public.telemetry_traces | 216.0 KB |


## Storage

_nenhum_


## Auth (agregados)

| métrica | valor |
|---|---|
| usuários (~) | ~10 |
| confirmados (~) | ~10 |
| criados últimos 30d (~) | 0 |

| provider | usuários (~) |
|---|---|
| email | 4 |
| google | 3 |


## Consultas mais custosas (pg_stat_statements, desde o último reset)
| role | chamadas (~) | total ms (~) | média ms | query |
|---|---|---|---|---|
| postgres | ~7.6k | ~9.1M | 1189.57 | `select public.snapshot_cron_health()` |
| authenticated | ~62.2k | ~5.7M | 92.15 | `WITH pgrst_source AS (INSERT INTO "public"."error_logs"("component_name", "message", "metadata", "stack", "url") SELECT "pgrst_body"."component_name", "pgrst_body"."message", "pgrst_body"."metadata", "pgrst_body"."stack"` |
| authenticated | ~23.6k | ~2.8M | 117.50 | `WITH pgrst_source AS ( SELECT "public"."jobs".*, row_to_json("jobs_machines_1".*)::jsonb AS "machines", row_to_json("jobs_techniques_1".*)::jsonb AS "techniques" FROM "public"."jobs" LEFT JOIN LATERAL ( SELECT "machines_` |
| postgres | ~570 | ~1.3M | 2357.04 | `SELECT jobid, runid, status, start_time, end_time, EXTRACT($2 FROM (end_time - start_time))::numeric(10,2) AS seconds, left(return_message, $3) AS return_message FROM (SELECT *, row_number() OVER (PARTITION BY jobid ORDE` |
| authenticated | ~420 | ~1.3M | 3042.06 | `WITH pgrst_source AS (SELECT "pgrst_call".* FROM "public"."get_cron_health"() pgrst_call) SELECT $3::bigint AS total_result_set, pg_catalog.count(_postgrest_t) AS page_total, coalesce(json_agg(_postgrest_t), $4) AS body,` |
| authenticated | ~9.3k | ~1.3M | 138.10 | `WITH pgrst_source AS ( SELECT "public"."jobs".*, row_to_json("jobs_machines_1".*)::jsonb AS "machines", row_to_json("jobs_techniques_1".*)::jsonb AS "techniques" FROM "public"."jobs" LEFT JOIN LATERAL ( SELECT "machines_` |
| postgres | ~600 | ~1.1M | 1909.74 | `SELECT n.nspname AS schema, c.relname AS "table", a.attnum AS position, a.attname AS name, format_type(a.atttypid, a.atttypmod) AS type, NOT a.attnotnull AS nullable, pg_get_expr(d.adbin, d.adrelid) AS "default", NULLIF(` |
| postgres | ~600 | ~1.1M | 1782.20 | `SELECT e.extname AS name, e.extversion AS version, n.nspname AS schema, (SELECT default_version FROM pg_available_extensions a WHERE a.name = e.extname) AS available_version FROM pg_extension e JOIN pg_namespace n ON n.o` |
| authenticated | ~53.2k | ~939.5k | 17.67 | `WITH pgrst_source AS ( SELECT "public"."inventory_movements".*, row_to_json("inventory_movements_profiles_1".*)::jsonb AS "profiles", row_to_json("inventory_movements_inventory_items_1".*)::jsonb AS "inventory_items" FRO` |
| authenticated | ~9.9k | ~832.9k | 84.22 | `WITH pgrst_source AS ( SELECT "public"."jobs".* FROM "public"."jobs" ORDER BY "public"."jobs"."created_at" DESC LIMIT $1 OFFSET $2 ) SELECT $3::bigint AS total_result_set, pg_catalog.count(_postgrest_t) AS page_total, co` |
| authenticated | ~320 | ~780.8k | 2463.10 | `WITH pgrst_source AS ( SELECT "public"."error_logs"."id", "public"."error_logs"."created_at", "public"."error_logs"."message", "public"."error_logs"."component_name", "public"."error_logs"."url" FROM "public"."error_logs` |
| authenticated | ~29.9k | ~599.3k | 20.04 | `WITH pgrst_source AS ( SELECT "public"."jobs".*, row_to_json("jobs_machines_1".*)::jsonb AS "machines", row_to_json("jobs_techniques_1".*)::jsonb AS "techniques" FROM "public"."jobs" LEFT JOIN LATERAL ( SELECT "machines_` |
| authenticated | ~40.4k | ~576.9k | 14.27 | `WITH pgrst_source AS ( SELECT "public"."inventory_items".* FROM "public"."inventory_items" ORDER BY "public"."inventory_items"."name" ASC , "public"."inventory_items"."id" ASC LIMIT $1 OFFSET $2 ) SELECT $3::bigint AS to` |
| authenticated | ~53.1k | ~565.3k | 10.65 | `WITH pgrst_source AS ( SELECT "public"."business_config".* FROM "public"."business_config" LIMIT $1 OFFSET $2 ) SELECT $3::bigint AS total_result_set, pg_catalog.count(_postgrest_t) AS page_total, coalesce(json_agg(_post` |
| postgres | ~600 | ~543.4k | 905.68 | `SELECT n.nspname AS schema, p.proname AS name, pg_get_function_identity_arguments(p.oid) AS args, pg_get_function_result(p.oid) AS returns, l.lanname AS language, CASE p.prokind WHEN $1 THEN $2 WHEN $3 THEN $4 WHEN $5 TH` |


## Conexões
| usuário | estado | n |
|---|---|---|
| authenticator | idle | 1 |
| pgbouncer | idle | 1 |
| postgres | active | 1 |
| postgres | idle | 1 |
| supabase_admin | idle | 2 |
| supabase_admin |  | 1 |


## Saúde dos serviços
```json
[
  {
    "healthy": true,
    "info": {
      "description": "GoTrue is a user registration and authentication API",
      "name": "GoTrue",
      "version": "v2.198.0"
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
      "node": "realtime@2600:1f1c:c90:ad00:dd68:d88:818b:ba1a",
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
