# CHANGELOG do snapshot Supabase

Diff semântico gerado a cada coleta em que algo mudou.

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

