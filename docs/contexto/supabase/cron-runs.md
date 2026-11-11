# Cron — execuções recentes

Últimas 3 por job (7 dias). Definições em `cron.md`.


## 3 · snapshot-cron-health-15min

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-11 00:15:03 | failed | 120.78 | ERROR:  canceling statement due to statement timeout CONTEXT:  SQL statement "SELECT COUNT(*)                  FROM (         SELECT d.status,                SUM(CASE WHEN d.status = 'succeeded' THEN 1 ELSE 0 END)                  OVER (ORDER BY d.start_time DESC ROWS BETWEEN UNBOUNDED PRECEDING AND |
| 2026-11-11 00:00:02 | failed | 120.80 | ERROR:  canceling statement due to statement timeout CONTEXT:  SQL statement "SELECT d.status, d.start_time, d.end_time, d.return_message                    FROM cron.job_run_details d      WHERE d.jobid = j.jobid      ORDER BY d.start_time DESC      LIMIT 1" PL/pgSQL function snapshot_cron_health() |
| 2026-11-10 23:45:00 | failed | 10.69 | job startup timeout |


## 5 · cron-alert-email-every-30min

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-11 00:00:02 | succeeded | 0.24 | 1 row |
| 2026-11-10 23:30:00 | succeeded | 0.04 | 1 row |
| 2026-11-10 23:00:00 | succeeded | 0.06 | 1 row |


## 6 · health-monitor-every-5min

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-11 00:25:03 | succeeded | 0.24 | 1 row |
| 2026-11-11 00:20:06 | succeeded | 0.74 | 1 row |
| 2026-11-11 00:15:03 | succeeded | 0.93 | 1 row |


## 7 · purge-old-logs-daily

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 03:15:00 | succeeded | 0.19 | 11 rows |
| 2026-11-09 03:15:00 | succeeded | 0.34 | 11 rows |
| 2026-11-08 03:15:00 | succeeded | 1.04 | 11 rows |


## 9 · rollup-cron-p95-daily

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 03:20:00 | succeeded | 0.29 | 1 row |
| 2026-11-09 03:20:00 | succeeded | 0.30 | 1 row |
| 2026-11-08 03:20:00 | succeeded | 0.45 | 1 row |


## 11 · auto-promote-jobs-fallback

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-11 00:25:03 | succeeded | 0.24 | 1 row |
| 2026-11-11 00:20:06 | succeeded | 0.77 | 1 row |
| 2026-11-11 00:15:03 | succeeded | 0.78 | 1 row |


## 12 · auto-reassign-packaging-30min

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-11 00:25:03 | succeeded | 0.14 | 1 row |
| 2026-11-11 00:20:06 | succeeded | 0.36 | 1 row |
| 2026-11-11 00:15:03 | succeeded | 0.58 | 1 row |
