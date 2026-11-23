# CHANGELOG do snapshot Supabase

Diff semântico gerado a cada coleta em que algo mudou.

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

