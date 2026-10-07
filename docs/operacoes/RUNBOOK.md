# Runbook operacional — FAST GRAVAÇÕES v2

Guia de deploy, rollback e restore. Tudo que exige acesso a painel externo
está marcado com **[PAINEL]** — o resto é feito pelo repositório.

## Componentes

| Componente | Onde vive | Como é deployado |
|---|---|---|
| Frontend (SPA Vite) | Vercel (`juca1/fast-gravacoes-v2`) | push na `main` → deploy automático |
| Postgres + Auth + PostgREST | Supabase produção canônica `uoujzvpecohinketylud` (`supabase/ENVIRONMENTS.md`, confirmado pelo owner) | `supabase db push` (migrations) |
| Edge Functions (34) | mesmo projeto Supabase `uoujzvpecohinketylud` | `supabase functions deploy` |
| Crons | 2 versionados em migrations (`rollup-cron-p95-daily`, `auto-promote-jobs-fallback`) + ~11 no painel **[PAINEL]** | migrations / Supabase Dashboard → Edge Functions → Cron |
| DB Webhooks | painel **[PAINEL]** | Supabase Dashboard → Database → Webhooks |

Os gatilhos de cada function estão em `supabase/functions/REGISTRY.md` (introduzido no PR #80).

## Deploy normal

1. PR aprovado + CI verde → merge na `main`. A Vercel deploya sozinha.
2. Se o PR tem `supabase/migrations/`:
   ```bash
   supabase link --project-ref uoujzvpecohinketylud
   supabase db push            # aplica só migrations novas, em ordem
   ```
3. Se o PR mexe em `supabase/functions/<nome>`:
   ```bash
   supabase functions deploy <nome>
   # ou todas: supabase functions deploy
   ```
4. Verificar: `health-check` no painel + smoke manual da página tocada.

**Regra:** migration NUNCA vai sozinha. Deploy do código que depende dela
vem junto (mesma janela), senão o front chama RPC/coluna inexistente.

## Rollback

### Frontend (rápido, ~1 min) **[PAINEL]**
Vercel Dashboard → Deployments → ⋮ no deploy anterior → **Redeploy**.
Sem rebuild, volta o artefato anterior imediatamente.

### Frontend (via git)
```bash
git revert <sha-do-merge> && git push origin main
```

### Edge function
```bash
git checkout <sha-anterior> -- supabase/functions/<nome>
supabase functions deploy <nome>
```

### Migration
Migrations são forward-only: o rollback é uma **migration nova** que
desfaz (ex.: `DROP FUNCTION`/`ALTER` reverso). Nunca editar migration já
aplicada, nunca `db reset` em produção.

## Backup e restore

Sem PITR automático confirmado no projeto canônico — backup é via `pg_dump`
agendado **[PAINEL]**. A function `backup-scheduler` existe no repo mas
hoje não há evidência de agendamento ativo nem de restore testado.

### Procedimento de backup (recomendado)
```bash
pg_dump "postgresql://postgres:<senha>@<host>:5432/postgres" \
  --format=custom --file=backup-$(date +%F).dump
```
Reter: diário por 7 dias, semanal por 4 semanas, mensal por 12 meses.
Copiar para storage fora do mesmo host (S3/B2/outro servidor).

### Restore testado (drill trimestral obrigatório)
1. Subir Postgres descartável (Docker local ou VPS separada).
2. `pg_restore --dbname="postgresql://postgres:<senha>@<host-descartavel>:5432/postgres" --clean --if-exists backup-<data>.dump`.
3. Conferir contagens: `jobs`, `profiles`, `audit_log`, `production_lots`.
4. Anotar: tempo total, linhas esperadas vs. restauradas, quem assinou.
5. Registrar a evidência em `docs/operacoes/drills/AAAA-MM-restore.md`.

**Metas:** RPO ≤ 24h (backup diário) | RTO ≤ 2h (VPS novo + restore + redeploy).

## Incidentes comuns

| Sintoma | Provável causa | Ação |
|---|---|---|
| Página em branco pós-deploy | CSP bloqueou recurso novo | console do browser → diretiva violada → ajustar `vercel.json`/`index.html` |
| Login não abre (lockout) | `check-login-lockout` consulta `login_lockouts` por e-mail/IP | expirar o lock: `UPDATE login_lockouts SET locked_until = now() - interval '1 minute' WHERE identifier = lower('<email>') AND identifier_type = 'email';` Para lock por IP, usar `identifier = '<ip>' AND identifier_type = 'ip'`. |
| Função 401 do nada | `verify_jwt` vs. chamador sem JWT | conferir `config.toml` + quem invoca (REGISTRY.md) |
| Cron não rodou | cron só existe no painel | Dashboard → Edge Functions → Cron **[PAINEL]** |
| Dados sumindo da tela | query passou de 1000 linhas (cap PostgREST) | usar `fetchAllRows` (`src/lib/fetchAllRows.ts`) |
