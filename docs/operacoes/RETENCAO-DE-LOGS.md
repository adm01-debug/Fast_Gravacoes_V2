# Política de retenção de logs e dados operacionais

Tabelas que crescem para sempre degradam queries e backups. Regra geral:
log de segurança/telemetria tem retenção curta; dado de negócio
(jobs, lotes, manutenção) NUNCA é apagado por rotina — só via purge
manual do `cron-cleanup` (arquivação de jobs antigos).

## Já implementado (cleanup-security-logs, roda via cron)

| Tabela | Retenção | Observação |
|---|---|---|
| `rate_limit_logs` | 7 dias | DELETE `< created_at - 7d` |
| `security_events` | 30 dias | DELETE `< created_at - 30d` |
| `login_audit` | 30 dias | DELETE `< created_at - 30d` |
| `blocked_ips` | não expira | `unblocked_at` marcado quando `expires_at` passa |

## Sem retenção hoje — pendências **[PAINEL]**

| Tabela | Risco | Retenção sugerida |
|---|---|---|
| `audit_log` | trilha de auditoria de negócio — cresce rápido | 12 meses (manter por LGPD/forense) |
| `job_status_audit` | trilha por job | seguir `audit_log` |
| `csp_violation_reports` | ruído alto por design | 90 dias |
| `machine_health_metrics` / telemetria | série temporal | 12 meses, depois rollup mensal |
| `webhook_deliveries` / dead letters | cresce com ERP | 90 dias |

### Como aplicar (quando tiver acesso ao banco)
Estender `cleanup-security-logs` ou criar migration com `pg_cron`:

```sql
-- Ex.: retenção de 90 dias para relatórios de CSP
SELECT cron.schedule('csp-reports-retention', '15 3 * * *', $$
  DELETE FROM public.csp_violation_reports
  WHERE created_at < now() - interval '90 days';
$$);
```

Aplicar o mesmo padrão (`cron.schedule` versionado em migration) para as
demais tabelas — o cron só fica auditável se estiver em migration, não
só configurado no painel.
