# CHANGELOG do snapshot Supabase

Diff semântico gerado a cada coleta em que algo mudou.

## 2026-11-26 19:39 UTC

- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`

## 2026-11-26 19:12 UTC

- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`

## 2026-11-26 18:39 UTC

- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`

## 2026-11-26 18:17 UTC

- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`

## 2026-11-26 17:40 UTC

- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`

## 2026-11-26 16:40 UTC

- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`
- **migrations** adicionado (1): `20261129230000_restore_increment_sheet_view_count_execute`

## 2026-11-26 16:18 UTC

- **cron jobs** adicionado (3): `39:cron-alert-email-every-30min`, `40:health-monitor-every-5min`, `41:metrics-collector-every-5min`
- **cron jobs** removido (3): `29:cron-alert-email-every-30min`, `30:health-monitor-every-5min`, `31:metrics-collector-every-5min`
- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`
- **functions** adicionado (4): `public.list_login_lockouts(p_limit integer)`, `public.release_login_lockout(p_identifier text, p_identifier_type text)`, `public.resolve_kpi_alert(p_alert_id uuid)`, `public.security_events_limita_severidade_do_cliente()`
- **functions** alterado (3): `app_private.normalize_functions_base_url()`, `public.count_active_operators_since(p_since timestamp with time zone)`, `public.count_running_machines()`
- **lints** adicionado (2): `realtime_replica_identity:public.blocked_ips`, `realtime_replica_identity:public.security_events`
- **migrations** adicionado (4): `20261126120000_restore_internal_cron_calls`, `20261126130000_normalize_functions_base_url`, `20261129190000_realtime_seguranca_e_crons_por_url_derivada`, `20261129200000_security_events_severidade_cliente`
- **realtime** adicionado (2): `supabase_realtime:public.blocked_ips`, `supabase_realtime:public.security_events`
- **triggers** adicionado (1): `public.security_events.security_events_limita_severidade_do_cliente`

## 2026-11-26 15:39 UTC

- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`

## 2026-11-26 14:44 UTC

- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`
- **migrations** adicionado (2): `20261129100000_restore_increment_job_lost_pieces`, `20261129210000_production_losses_contador_atomico`

## 2026-11-26 14:22 UTC

- **cron jobs** adicionado (1): `35:refresh-machine-health-metrics`
- **cron jobs** removido (1): `28:refresh-machine-health-metrics`
- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`
- **functions** adicionado (1): `public.production_losses_aplicar_contador()`
- **functions** alterado (1): `public.refresh_machine_health_metrics(p_days integer)`
- **migrations** adicionado (2): `20261129110000_refresh_machine_health_metrics`, `20261129160000_maquina_sem_os_e_arquivadas`
- **triggers** adicionado (1): `public.production_losses.trg_production_losses_contador`

## 2026-11-26 13:39 UTC

- **functions** alterado (1): `public.increment_job_lost_pieces(p_job_id uuid, p_amount integer)`

## 2026-11-26 13:18 UTC

- **edge functions** alterado (1): `metrics-collector`

## 2026-11-26 11:38 UTC

- **cron jobs** adicionado (3): `29:cron-alert-email-every-30min`, `30:health-monitor-every-5min`, `31:metrics-collector-every-5min`
- **cron jobs** removido (3): `23:cron-alert-email-every-30min`, `24:health-monitor-every-5min`, `25:metrics-collector-every-5min`
- **functions** adicionado (1): `app_private.functions_base_url()`
- **functions** alterado (3): `app_private.normalize_functions_base_url()`, `public.count_active_operators_since(p_since timestamp with time zone)`, `public.count_running_machines()`

## 2026-11-26 11:13 UTC

- **cron jobs** adicionado (1): `28:refresh-machine-health-metrics`
- **functions** adicionado (2): `public.increment_job_lost_pieces(p_job_id uuid, p_amount integer)`, `public.refresh_machine_health_metrics(p_days integer)`

## 2026-11-26 10:38 UTC

- **functions** adicionado (2): `app_private.normalize_functions_base_url()`, `app_private.project_ref_from_key(p_key text)`
- **triggers** adicionado (1): `app_private.runtime_config.trg_normalize_functions_base_url`

## 2026-11-26 10:15 UTC

- **cron jobs** adicionado (3): `23:cron-alert-email-every-30min`, `24:health-monitor-every-5min`, `25:metrics-collector-every-5min`
- **cron jobs** removido (2): `5:cron-alert-email-every-30min`, `6:health-monitor-every-5min`
- **functions** adicionado (2): `public.count_active_operators_since(p_since timestamp with time zone)`, `public.count_running_machines()`

## 2026-11-26 02:40 UTC

- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`

## 2026-11-26 01:16 UTC

- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`

## 2026-11-26 00:37 UTC

- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`

## 2026-11-25 23:14 UTC

- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`

## 2026-11-25 21:38 UTC

- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`

## 2026-11-25 20:38 UTC

- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`

## 2026-11-25 20:13 UTC

- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`

## 2026-11-25 17:38 UTC

- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`

## 2026-11-25 17:12 UTC

- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`

## 2026-11-25 16:38 UTC

- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`

## 2026-11-25 15:15 UTC

- **colunas** adicionado (2): `public.archived_jobs.cancel_reason`, `public.archived_jobs.external_ref`
- **constraints** alterado (2): `public.production_losses.production_losses_job_id_fkey`, `public.shipments.shipments_job_id_fkey`
- **cron jobs** adicionado (1): `22:archive-finished-jobs-daily`
- **functions** adicionado (3): `public.archive_jobs(p_older_than timestamp with time zone, p_job_id uuid)`, `public.get_finished_jobs_for_evolution(p_since timestamp with time zone, p_limit integer, p_offset integer)`, `public.validate_job_delete_allowed()`
- **functions** alterado (3): `public.archive_finished_jobs(p_older_than timestamp with time zone)`, `public.check_job_overlap()`, `public.get_public_tracking(p_job_id uuid, p_order_number text)`
- **migrations** adicionado (6): `20261128100000_block_delete_job_with_production`, `20261128110000_fk_production_losses_restrict`, `20261128120000_fk_shipments_restrict`, `20261128130000_f038_arquivar_os_concluida`, `20261128140000_realtime_push_notifications`, `20261128150000_f053_os_concluida_nao_ocupa_maquina`
- **realtime** adicionado (1): `supabase_realtime:public.push_notifications`
- **tabelas** alterado (1): `public.push_notifications`
- **triggers** adicionado (1): `public.jobs.trg_validate_job_delete_allowed`

## 2026-11-25 14:39 UTC

- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`

## 2026-11-25 13:38 UTC

- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`

## 2026-11-25 11:39 UTC

- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`

## 2026-11-25 10:39 UTC

- **config: storage_config** alterado (1): `storage_config`

## 2026-11-25 01:15 UTC

- **edge functions** alterado (30): `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`

## 2026-11-25 00:34 UTC

- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`

## 2026-11-24 23:12 UTC

- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`

## 2026-11-24 22:38 UTC

- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`
- **functions** alterado (2): `app_private.has_role(_user_id uuid, _role app_role)`, `public.has_role(_user_id uuid, _role app_role)`
- **lints** removido (1): `rpc_anon_executable:public.has_role(_user_id uuid, _role app_role)`
- **migrations** adicionado (1): `20261127120000_isolate_public_has_role`
- **policies (RLS)** alterado (12): `public.erp_api_keys.Managers can manage API keys`, `storage.objects.Owner or staff can view production photos`, `storage.objects.Owner or staff view execution evidence`, `storage.objects.Owner or staff view tpm evidences`, `storage.objects.Owner or staff view tpm signatures`, `storage.objects.Owners and staff can delete execution-evidence`, `storage.objects.Owners and staff can delete tpm-evidences`, `storage.objects.Owners and staff can delete tpm_signatures`, `storage.objects.Owners and staff can update execution-evidence`, `storage.objects.Owners and staff can update tpm-evidences`, `storage.objects.Owners and staff can update tpm_signatures`, `storage.objects.Staff or approved-only view technical documents`

## 2026-11-24 22:13 UTC

- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`

## 2026-11-24 21:13 UTC

- **config: auth_config** alterado (1): `auth_config`
- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`

## 2026-11-24 18:16 UTC

- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`

## 2026-11-24 17:41 UTC

- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`

## 2026-11-24 17:13 UTC

- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`
- **migrations** adicionado (1): `20261126110000_restore_public_has_role_execute`

## 2026-11-24 16:38 UTC

- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`

## 2026-11-24 16:15 UTC

- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`

## 2026-11-24 14:15 UTC

- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`

## 2026-11-24 13:40 UTC

- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`

## 2026-11-24 12:40 UTC

- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`
- **migrations** adicionado (1): `20261124111000_add_techniques_personalizacao`
- **tabelas** alterado (1): `public.techniques`

## 2026-11-24 10:39 UTC

- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`
- **migrations** adicionado (1): `20261125170000_restore_erp_api_keys`

## 2026-11-24 09:15 UTC

- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`
- **functions** adicionado (1): `public.apply_job_sequence(p_slots jsonb)`
- **migrations** adicionado (1): `20261126100000_f011_rpc_apply_job_sequence`

## 2026-11-24 03:38 UTC

- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`

## 2026-11-24 02:19 UTC

- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`

## 2026-11-24 01:16 UTC

- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`

## 2026-11-24 00:32 UTC

- **colunas** adicionado (8): `public.erp_api_keys.created_at`, `public.erp_api_keys.created_by`, `public.erp_api_keys.id`, `public.erp_api_keys.is_active`, `public.erp_api_keys.key_hash`, `public.erp_api_keys.last_used_at`, `public.erp_api_keys.name`, `public.jobs.external_ref`
- **constraints** adicionado (3): `public.erp_api_keys.erp_api_keys_created_by_fkey`, `public.erp_api_keys.erp_api_keys_key_hash_key`, `public.erp_api_keys.erp_api_keys_pkey`
- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`
- **grants** adicionado (3): `public.erp_api_keys:anon`, `public.erp_api_keys:authenticated`, `public.erp_api_keys:service_role`
- **indexes** adicionado (3): `public.erp_api_keys_key_hash_key`, `public.erp_api_keys_pkey`, `public.idx_jobs_external_ref`
- **lints** adicionado (1): `fk_without_index:public.erp_api_keys.erp_api_keys_created_by_fkey`
- **migrations** adicionado (1): `20261125130000_jobs_external_ref`
- **policies (RLS)** adicionado (1): `public.erp_api_keys.Managers can manage API keys`
- **tabelas** adicionado (1): `public.erp_api_keys`

## 2026-11-23 23:15 UTC

- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`

## 2026-11-23 21:38 UTC

- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`

## 2026-11-23 16:16 UTC

- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`

## 2026-11-23 15:29 UTC

- **constraints** alterado (1): `public.job_status_history.job_status_history_changed_by_fkey`
- **edge functions** alterado (1): `health-monitor`
- **functions** adicionado (2): `public.preventdefault_hold_shipment_update()`, `public.update_shipment_status(p_shipment_id uuid, p_status text)`
- **functions** alterado (6): `public.assign_packaging_task(p_task_id uuid)`, `public.audit_job_status_change()`, `public.calculate_audit_hash(rec audit_log)`, `public.log_job_status_change()`, `public.record_packaging_defect(p_task_id uuid, p_quantity integer, p_defect_type text, p_severity text, p_decision text, p_photo_url text, p_notes text, p_loss_reason text, p_request_id uuid)`, `public.verify_audit_chain(_limit integer)`
- **lints** adicionado (1): `rpc_anon_executable:public.update_shipment_status(p_shipment_id uuid, p_status text)`
- **lints** removido (1): `rpc_anon_executable:public.verify_audit_chain(_limit integer)`
- **migrations** adicionado (3): `20261121110000_fix_audit_triggers_old_values`, `20261122120000_f010_rpc_record_defect_atomic`, `20261122150000_f010_v3_shipment_hold_e_qtde`
- **triggers** adicionado (1): `public.shipments.trg_prevent_hold_shipment_update`

## 2026-11-23 11:30 UTC

- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`
- **functions** adicionado (1): `public.has_permission(_permission text)`
- **lints** adicionado (10): `policy_auth_fn_not_wrapped:public.energy_alerts.Active roles can create energy alerts`, `policy_auth_fn_not_wrapped:public.energy_alerts.Active roles can delete energy alerts`, `policy_auth_fn_not_wrapped:public.energy_alerts.Active roles can update energy alerts`, `policy_auth_fn_not_wrapped:public.energy_consumption.Coordinators can create energy consumption`, `policy_auth_fn_not_wrapped:public.energy_consumption.Coordinators can delete energy consumption`, `policy_auth_fn_not_wrapped:public.energy_consumption.Coordinators can update energy consumption`, `policy_auth_fn_not_wrapped:public.energy_targets.Coordinators can create energy targets`, `policy_auth_fn_not_wrapped:public.energy_targets.Coordinators can delete energy targets`, `policy_auth_fn_not_wrapped:public.energy_targets.Coordinators can update energy targets`, `rpc_anon_executable:public.has_permission(_permission text)`
- **migrations** adicionado (1): `20261123000000_enforce_energy_read_permission_rls`
- **policies (RLS)** adicionado (12): `public.energy_alerts.Active roles can create energy alerts`, `public.energy_alerts.Active roles can delete energy alerts`, `public.energy_alerts.Active roles can update energy alerts`, `public.energy_alerts.Energy readers can view energy alerts`, `public.energy_consumption.Coordinators can create energy consumption`, `public.energy_consumption.Coordinators can delete energy consumption`, `public.energy_consumption.Coordinators can update energy consumption`, `public.energy_consumption.Energy readers can view energy consumption`, `public.energy_targets.Coordinators can create energy targets`, `public.energy_targets.Coordinators can delete energy targets`, `public.energy_targets.Coordinators can update energy targets`, `public.energy_targets.Energy readers can view energy targets`
- **policies (RLS)** removido (3): `public.energy_alerts.Active roles can manage energy alerts`, `public.energy_consumption.Coordinators can manage energy consumption`, `public.energy_targets.Coordinators can manage energy targets`

## 2026-11-22 12:18 UTC

- **migrations** adicionado (1): `20261122010000_seed_role_permissions`

## 2026-11-22 11:37 UTC

- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`

## 2026-11-22 10:12 UTC

- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`

## 2026-11-22 09:37 UTC

- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`

## 2026-11-22 09:14 UTC

- **edge functions** alterado (33): `approve-password-reset`, `auto-promote-jobs`, `backup-scheduler`, `bitrix24-sync`, `calculate-inventory-intelligence`, `calculate-rankings`, `check-login-lockout`, `cleanup-security-logs`, `create-operator`, `cron-alert-email`, `cron-cleanup`, `csp-report`, `daily-maintenance-summary`, `erp-api`, `excel-export`, `external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`, `ml-predictions`, `new-device-alert`, `pdf-generator`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-push-notification`, `send-tpm-email`, `technical-assistant`, `tpm-notifications`, `update-operator`, `validate-login-ip`, `webhook-handler`

## 2026-11-22 08:17 UTC

- Snapshot inicial.

