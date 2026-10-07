# Política de retenção de logs e dados operacionais

Tabelas que crescem para sempre degradam queries e backups. Regra geral:
log de segurança/telemetria tem retenção curta; dado de negócio
(jobs, lotes, manutenção) NUNCA é apagado por rotina — só via purge
manual do `cron-cleanup` (arquivação de jobs antigos).

## Implementado: `purge_old_logs()` — migration `20261002130000_csp_reports_retention.sql`

A function `purge_old_logs()` (SECURITY DEFINER, `REVOKE EXECUTE` de anon/
authenticated/PUBLIC, `GRANT` só para service_role) é agendada
**versionada** via `pg_cron` como `purge-old-logs-daily` (`15 3 * * *`),
chamada direto em SQL — não depende de HTTP/JWT. Cobertura real:

| Tabela | Retenção | Observação |
|---|---|---|
| `rate_limit_logs` | 7 dias | DELETE `< created_at - 7d` |
| `login_audit` | 90 dias | DELETE `< created_at - 90d` |
| `security_events` | 180 dias | DELETE `< created_at - 180d` |
| `webhook_logs` | 30 dias | DELETE `< created_at - 30d` |
| `error_logs` | 30 dias | DELETE `< created_at - 30d` |
| `geo_blocking_logs` | 60 dias | DELETE `< created_at - 60d` |
| `push_notifications` | 60 dias | só `status IN ('sent','delivered','failed')` |
| `query_telemetry` | 14 dias | DELETE `< created_at - 14d` |
| `telemetry_traces` | 14 dias | DELETE `< created_at - 14d` |
| `edge_health_history` | 30 dias | DELETE `< captured_at - 30d` |
| `csp_violation_reports` | 14 dias | condicional (`to_regclass`) — tolerante a ambientes sem a tabela |
| `blocked_ips` | não expira | `unblocked_at` marcado quando `expires_at` passa |

> A Edge Function `cleanup-security-logs` faz purge próprio sobre
> `security_events`/`login_audit` com janelas mais curtas — convive com o
> purge versionado (o mais restritivo vence na prática). Exige
> `x-cron-secret` + `x-api-key` (`CRON_API_KEY`).

## Sem retenção hoje — pendências **[PAINEL]**

| Tabela | Risco | Retenção sugerida |
|---|---|---|
| `audit_log` | trilha de auditoria de negócio — cresce rápido | 12 meses (manter por LGPD/forense) |
| `job_status_audit` | trilha por job | seguir `audit_log` |
| `machine_health_metrics` / telemetria | série temporal | 12 meses, depois rollup mensal |
| `webhook_deliveries` / dead letters | cresce com ERP | 90 dias |

### Como aplicar (quando tiver acesso ao banco)
Estender `purge_old_logs()` numa migration nova — o padrão é `cron.schedule`
versionado em migration (auditável), não agendamento no painel.
