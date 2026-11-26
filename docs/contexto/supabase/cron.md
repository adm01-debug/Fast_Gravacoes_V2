# Cron (pg_cron)

Horários em UTC. Execuções recentes em `cron-runs.md`. O `command` de cada job nunca sai daqui (pode ter URL e cabeçalho com segredo, ex.: `x-cron-secret`) — só o nome das funções chamadas; ver `redigir_comando_cron()` em `scripts/supabase_snapshot/snapshot.py`.

| id | nome | schedule | ativo | database | usuário | chama |
|---|---|---|---|---|---|---|
| 3 | snapshot-cron-health-15min | `*/15 * * * *` | sim | postgres | postgres | `chama: public.snapshot_cron_health` |
| 7 | purge-old-logs-daily | `15 3 * * *` | sim | postgres | postgres | `chama: public.purge_old_logs` |
| 9 | rollup-cron-p95-daily | `20 3 * * *` | sim | postgres | postgres | `chama: public.rollup_cron_p95_daily` |
| 12 | auto-reassign-packaging-30min | `*/5 * * * *` | sim | postgres | postgres | `chama: public.auto_reassign_stale_packaging_tasks` |
| 13 | auto-promote-jobs-fallback | `*/5 * * * *` | sim | postgres | postgres | `chama: net.http_post` |
| 22 | archive-finished-jobs-daily | `7 4 * * *` | sim | postgres | postgres | `chama: public.archive_finished_jobs` |
| 28 | refresh-machine-health-metrics | `10 4 * * *` | sim | postgres | postgres | `chama: public.refresh_machine_health_metrics` |
| 29 | cron-alert-email-every-30min | `*/30 * * * *` | sim | postgres | postgres | `chama: net.http_post` |
| 30 | health-monitor-every-5min | `*/5 * * * *` | sim | postgres | postgres | `chama: net.http_post` |
| 31 | metrics-collector-every-5min | `*/5 * * * *` | sim | postgres | postgres | `chama: net.http_post` |
