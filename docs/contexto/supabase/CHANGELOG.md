# CHANGELOG do snapshot Supabase

Diff semântico gerado a cada coleta em que algo mudou.

## 2026-11-12 10:13 UTC

- **config: auth_config** alterado (1): `auth_config`

## 2026-11-11 23:19 UTC

- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `rate-limit-check`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`

## 2026-11-11 20:16 UTC

- **functions** alterado (5): `public.auto_reassign_stale_packaging_tasks()`, `public.get_cron_health()`, `public.get_packaging_leaderboard()`, `public.get_packaging_manifest(p_task_ids uuid[])`, `public.get_system_status_summary()`
- **lints** removido (5): `rpc_anon_executable:public.auto_reassign_stale_packaging_tasks()`, `rpc_anon_executable:public.get_cron_health()`, `rpc_anon_executable:public.get_packaging_leaderboard()`, `rpc_anon_executable:public.get_packaging_manifest(p_task_ids uuid[])`, `rpc_anon_executable:public.get_system_status_summary()`
- **migrations** adicionado (1): `20261109000001_fix_r3_3_revoke_public`

## 2026-11-11 10:39 UTC

- **config: auth_config** alterado (1): `auth_config`
- **realtime** removido (8): `supabase_realtime_messages_publication:realtime.messages_2026_11_07`, `supabase_realtime_messages_publication:realtime.messages_2026_11_08`, `supabase_realtime_messages_publication:realtime.messages_2026_11_09`, `supabase_realtime_messages_publication:realtime.messages_2026_11_10`, `supabase_realtime_messages_publication:realtime.messages_2026_11_11`, `supabase_realtime_messages_publication:realtime.messages_2026_11_12`, `supabase_realtime_messages_publication:realtime.messages_2026_11_13`, `supabase_realtime_messages_publication:realtime.messages_2026_11_14`

## 2026-11-11 06:54 UTC

- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_14`

## 2026-11-10 19:45 UTC

- **edge functions** alterado (1): `new-device-alert`

## 2026-11-10 01:29 UTC

- **realtime** adicionado (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_13`
- **realtime** removido (1): `supabase_realtime_messages_publication:realtime.messages_2026_11_06`

## 2026-11-09 11:16 UTC

- **config: auth_config** adicionado (1): `auth_config`
- **edge functions** adicionado (34): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `rate-limit-check`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`

## 2026-11-09 10:56 UTC

- **config: auth_config** removido (1): `auth_config`
- **edge functions** removido (34): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `rate-limit-check`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`

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

