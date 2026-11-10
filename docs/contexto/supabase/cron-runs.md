# Cron — execuções recentes

Últimas 3 por job (7 dias). Definições em `cron.md`.


## 3 · snapshot-cron-health-15min

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 22:45:02 | failed | 120.29 | ERROR:  canceling statement due to statement timeout CONTEXT:  SQL statement "SELECT d.status, d.start_time, d.end_time, d.return_message                    FROM cron.job_run_details d      WHERE d.jobid = j.jobid      ORDER BY d.start_time DESC      LIMIT 1" PL/pgSQL function snapshot_cron_health() |
| 2026-11-10 22:30:00 | succeeded | 2.36 | 1 row |
| 2026-11-10 22:15:00 | succeeded | 1.70 | 1 row |


## 5 · cron-alert-email-every-30min

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 22:30:00 | succeeded | 0.03 | 1 row |
| 2026-11-10 22:00:00 | succeeded | 0.08 | 1 row |
| 2026-11-10 21:30:00 | succeeded | 0.04 | 1 row |


## 6 · health-monitor-every-5min

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 22:55:03 | succeeded | 0.24 | 1 row |
| 2026-11-10 22:50:03 | succeeded | 0.18 | 1 row |
| 2026-11-10 22:45:02 | succeeded | 1.34 | 1 row |


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
| 2026-11-10 22:55:03 | succeeded | 0.24 | 1 row |
| 2026-11-10 22:50:03 | succeeded | 0.18 | 1 row |
| 2026-11-10 22:45:02 | succeeded | 1.02 | 1 row |


## 12 · auto-reassign-packaging-30min

| início (UTC) | status | duração (s) | mensagem |
|---|---|---|---|
| 2026-11-10 22:55:03 | succeeded | 0.11 | 1 row |
| 2026-11-10 22:50:03 | succeeded | 0.09 | 1 row |
| 2026-11-10 22:45:02 | succeeded | 0.35 | 1 row |
