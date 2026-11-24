# Edge Functions

URL base: `https://uoujzvpecohinketylud.supabase.co/functions/v1/<slug>`. Metadados por função em `edge-functions/<slug>/README.md`. A Management API devolve só o bundle compilado; o fonte canônico é `supabase/functions/<slug>/` no repo.

| slug | nome | status | versão | verify_jwt | entrypoint |
|---|---|---|---|---|---|
| approve-password-reset | approve-password-reset | ACTIVE | 160 | sim | file:///app/supabase/functions/approve-password-reset/index.ts |
| auto-promote-jobs | auto-promote-jobs | ACTIVE | 160 | sim | file:///app/supabase/functions/auto-promote-jobs/index.ts |
| backup-scheduler | backup-scheduler | ACTIVE | 160 | sim | file:///app/supabase/functions/backup-scheduler/index.ts |
| bitrix24-sync | bitrix24-sync | ACTIVE | 161 | não | file:///app/supabase/functions/bitrix24-sync/index.ts |
| calculate-inventory-intelligence | calculate-inventory-intelligence | ACTIVE | 160 | sim | file:///app/supabase/functions/calculate-inventory-intelligence/index.ts |
| calculate-rankings | calculate-rankings | ACTIVE | 161 | sim | file:///app/supabase/functions/calculate-rankings/index.ts |
| check-login-lockout | check-login-lockout | ACTIVE | 160 | sim | file:///app/supabase/functions/check-login-lockout/index.ts |
| cleanup-security-logs | cleanup-security-logs | ACTIVE | 160 | sim | file:///app/supabase/functions/cleanup-security-logs/index.ts |
| create-operator | create-operator | ACTIVE | 160 | sim | file:///app/supabase/functions/create-operator/index.ts |
| cron-alert-email | cron-alert-email | ACTIVE | 160 | sim | file:///app/supabase/functions/cron-alert-email/index.ts |
| cron-cleanup | cron-cleanup | ACTIVE | 161 | sim | file:///app/supabase/functions/cron-cleanup/index.ts |
| csp-report | csp-report | ACTIVE | 161 | não | file:///app/supabase/functions/csp-report/index.ts |
| daily-maintenance-summary | daily-maintenance-summary | ACTIVE | 160 | sim | file:///app/supabase/functions/daily-maintenance-summary/index.ts |
| erp-api | erp-api | ACTIVE | 160 | sim | file:///app/supabase/functions/erp-api/index.ts |
| excel-export | excel-export | ACTIVE | 161 | sim | file:///app/supabase/functions/excel-export/index.ts |
| external-db-bridge | external-db-bridge | ACTIVE | 159 | sim | file:///app/supabase/functions/external-db-bridge/index.ts |
| health-check | health-check | ACTIVE | 161 | sim | file:///app/supabase/functions/health-check/index.ts |
| health-monitor | health-monitor | ACTIVE | 161 | sim | file:///app/supabase/functions/health-monitor/index.ts |
| image-optimizer | image-optimizer | ACTIVE | 153 | sim | file:///app/supabase/functions/image-optimizer/index.ts |
| metrics-collector | metrics-collector | ACTIVE | 160 | sim | file:///app/supabase/functions/metrics-collector/index.ts |
| ml-predictions | ml-predictions | ACTIVE | 161 | sim | file:///app/supabase/functions/ml-predictions/index.ts |
| new-device-alert | new-device-alert | ACTIVE | 168 | sim | file:///app/supabase/functions/new-device-alert/index.ts |
| pdf-generator | pdf-generator | ACTIVE | 159 | sim | file:///app/supabase/functions/pdf-generator/index.ts |
| security-alert | security-alert | ACTIVE | 160 | sim | file:///app/supabase/functions/security-alert/index.ts |
| send-email-report | send-email-report | ACTIVE | 162 | sim | file:///app/supabase/functions/send-email-report/index.ts |
| send-loss-risk-alert | send-loss-risk-alert | ACTIVE | 160 | sim | file:///app/supabase/functions/send-loss-risk-alert/index.ts |
| send-push-notification | send-push-notification | ACTIVE | 161 | sim | file:///app/supabase/functions/send-push-notification/index.ts |
| send-tpm-email | send-tpm-email | ACTIVE | 160 | sim | file:///app/supabase/functions/send-tpm-email/index.ts |
| technical-assistant | technical-assistant | ACTIVE | 161 | sim | file:///app/supabase/functions/technical-assistant/index.ts |
| tpm-notifications | tpm-notifications | ACTIVE | 160 | sim | file:///app/supabase/functions/tpm-notifications/index.ts |
| update-operator | update-operator | ACTIVE | 159 | sim | file:///app/supabase/functions/update-operator/index.ts |
| validate-login-ip | validate-login-ip | ACTIVE | 161 | sim | file:///app/supabase/functions/validate-login-ip/index.ts |
| webhook-handler | webhook-handler | ACTIVE | 161 | sim | file:///app/supabase/functions/webhook-handler/index.ts |


## Secrets (apenas nomes)

| nome |
|---|
| CRON_SECRET |
| CSP_REPORT_ALLOWED_HOSTS |
| SUPABASE_ANON_KEY |
| SUPABASE_DB_URL |
| SUPABASE_JWKS |
| SUPABASE_PUBLISHABLE_KEYS |
| SUPABASE_SECRET_KEYS |
| SUPABASE_SERVICE_ROLE_KEY |
| SUPABASE_URL |
| VAPID_PRIVATE_KEY |
| VAPID_PUBLIC_KEY |
| VAPID_SUBJECT |
