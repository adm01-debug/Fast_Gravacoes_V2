# Cron (pg_cron)

Horários em UTC. Execuções recentes em `cron-runs.md`.

| id | nome | schedule | ativo | database | usuário | comando |
|---|---|---|---|---|---|---|
| 3 | snapshot-cron-health-15min | `*/15 * * * *` | sim | postgres | postgres | `select public.snapshot_cron_health();` |
| 5 | cron-alert-email-every-30min | `*/30 * * * *` | sim | postgres | postgres | `select net.http_post(url := 'https://supabase.atomicabr.com.br/functions/v1/cron-alert-email', headers := jsonb_build_object('Content-Type','application/json','x-cron-secret','[REDACTED]'), body := jsonb_build_object('scheduled_at', now())) as request_id;` |
| 6 | health-monitor-every-5min | `*/5 * * * *` | sim | postgres | postgres | `select net.http_post(url := 'https://supabase.atomicabr.com.br/functions/v1/health-monitor', headers := jsonb_build_object('Content-Type','application/json','x-cron-secret','[REDACTED]'), body := jsonb_build_object('scheduled_at', now())) as request_id;` |
| 7 | purge-old-logs-daily | `15 3 * * *` | sim | postgres | postgres | `SELECT public.purge_old_logs()` |
| 9 | rollup-cron-p95-daily | `20 3 * * *` | sim | postgres | postgres | `SELECT public.rollup_cron_p95_daily(2);` |
| 11 | auto-promote-jobs-fallback | `*/5 * * * *` | sim | postgres | postgres | `SELECT net.http_post(            url := (SELECT value FROM app_private.runtime_config WHERE key = 'functions_base_url') \|\| '/auto-promote-jobs',            headers := jsonb_build_object(              'Content-Type', 'application/json',              'Authorization', 'Bearer ' \|\| coalesce((SELECT value FROM app_private.runtime_config WHERE key = 'service_role_key'), ''),              'x-cron-secret', coalesce((SELECT value FROM app_private.runtime_config WHERE key = 'cron_secret'), '')),            body := '{}'::jsonb)` |
| 12 | auto-reassign-packaging-30min | `*/5 * * * *` | sim | postgres | postgres | `SELECT public.auto_reassign_stale_packaging_tasks()` |
