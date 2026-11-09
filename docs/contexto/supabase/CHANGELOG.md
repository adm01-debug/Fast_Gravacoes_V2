# CHANGELOG do snapshot Supabase

Diff semântico gerado a cada coleta em que algo mudou.

## 2026-11-09 03:34 UTC

- **colunas** adicionado (2): `public.jobs.cancel_reason`, `public.packaging_tasks.loss_reason`
- **constraints** adicionado (1): `public.packaging_tasks.packaging_tasks_weight_per_package_check`
- **constraints** alterado (1): `public.packaging_tasks.packaging_tasks_packages_count_check`
- **cron jobs** adicionado (1): `12:auto-reassign-packaging-30min`
- **functions** adicionado (4): `public.on_job_cancelled_hold_packaging()`, `public.validate_job_cancel_reason()`, `public.validate_job_rework_depth()`, `public.validate_packaging_loss_reason()`
- **functions** alterado (1): `public.auto_reassign_stale_packaging_tasks()`
- **lints** adicionado (1): `secdef_mutable_search_path:public.auto_reassign_stale_packaging_tasks()`
- **migrations** adicionado (1): `20261108000001_business_rules_ddl`
- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_12`
- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_05`
- **triggers** adicionado (4): `public.jobs.trg_job_cancelled_hold_packaging`, `public.jobs.trg_validate_job_cancel_reason`, `public.jobs.trg_validate_job_rework_depth`, `public.packaging_tasks.trg_validate_packaging_loss_reason`

## 2026-11-08 17:29 UTC

- **grants** adicionado (413): `public.abc_activities:anon`, `public.abc_activities:authenticated`, `public.abc_activities:service_role`, `public.abc_activity_rates:anon`, `public.abc_activity_rates:authenticated`, `public.abc_activity_rates:service_role`, `public.abc_cost_pools:anon`, `public.abc_cost_pools:authenticated`, `public.abc_cost_pools:service_role`, `public.abc_job_costs:anon`, `public.abc_job_costs:authenticated`, `public.abc_job_costs:service_role`, `public.archived_jobs:anon`, `public.archived_jobs:authenticated`, `public.archived_jobs:service_role`, `public.audit_log:anon`, `public.audit_log:authenticated`, `public.audit_log:service_role`, `public.backup_logs:anon`, `public.backup_logs:authenticated`, `public.backup_logs:service_role`, `public.bitrix24_field_mappings:anon`, `public.bitrix24_field_mappings:authenticated`, `public.bitrix24_field_mappings:service_role`, `public.bitrix24_oauth_states:anon`, `public.bitrix24_oauth_states:authenticated`, `public.bitrix24_oauth_states:service_role`, `public.bitrix24_oauth_tokens:anon`, `public.bitrix24_oauth_tokens:authenticated`, `public.bitrix24_oauth_tokens:service_role`, `public.bitrix24_sync_history:anon`, `public.bitrix24_sync_history:authenticated`, `public.bitrix24_sync_history:service_role`, `public.blocked_ips:anon`, `public.blocked_ips:authenticated`, `public.blocked_ips:service_role`, `public.business_config:anon`, `public.business_config:authenticated`, `public.business_config:service_role`, `public.chat_messages:anon` … (+373)

## 2026-11-08 16:56 UTC

- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_04`

## 2026-11-08 15:59 UTC

- Snapshot inicial.

