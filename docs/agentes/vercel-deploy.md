# Vercel e deploy — referência para agentes

Ler quando for confirmar um deploy, mexer em env var, domínio, CSP/headers ou no deploy de Edge
Functions. Resumo das regras está em `AGENTS.md` (Serviços).

| O que | Valor |
|---|---|
| Front (SPA Vite) | Vercel, team `juca1`, projeto `fast-gravacoes-v2` (confirmado por `list_projects` do MCP Vercel) |
| Como sobe | Integração GitHub→Vercel: **merge em `main` = deploy de produção**. Nenhum workflow deploya o front |
| Domínio citado no repo | `fast-gravacoes-v2.vercel.app` (campo `homepage` do repo) e `fastgravacoes.com.br` (fallback de CORS e `CSP_REPORT_ALLOWED_HOSTS` em `db-admin.yml`) |
| Backend | Supabase `uoujzvpecohinketylud` — migrations e Edge Functions pelo `deploy.yml` (ver `banco.md`) |

> **NÃO VERIFICADO:** o token do MCP Vercel desta sessão lista projetos e teams, mas devolve 404 em
> `get_project`/`list_project_domains` e 403 em `list_deployments`/`list_aliases`, e o CLI `vercel` não
> está instalado. Logo: **não dá para confirmar por API** qual é o alias de produção, se o projeto está
> ligado a `adm01-debug/Fast_Gravacoes_V2`, nem o estado do último deploy. O vínculo repo↔projeto está
> documentado em `docs/operacoes/RUNBOOK.md:10` ("Vercel (juca1/fast-gravacoes-v2) | push na main →
> deploy automático"), não no código. Confirmação de deploy hoje é no dashboard + smoke da página tocada.

## Deploy

1. PR com CI verde → merge em `main` → a Vercel builda e publica sozinha (`RUNBOOK.md:20`).
2. Se o PR tem `supabase/migrations/`, o `deploy.yml` aplica no mesmo push; se tem
   `supabase/functions/<nome>`, o mesmo workflow deploya **todas** as functions depois das migrations.
3. **Migration nunca vai sozinha**: o código que depende dela entra na mesma janela (`RUNBOOK.md:33-34`).
4. Verificar: `health-check` no painel + smoke manual da página tocada (`RUNBOOK.md:31`).
5. O `dist/` que `ci.yml`/`deploy.yml` sobem como artifact é CI-only (insumo do job E2E) — **não** é o
   que vai para produção; a Vercel builda por conta.

## Rollback do front

- Rápido (**painel**, ~1 min, sem rebuild): Vercel → Deployments → ⋮ no deploy anterior → **Redeploy**
  (`RUNBOOK.md:38-40`).
- Via git: `git revert <sha-do-merge>` e push na `main` (`RUNBOOK.md:42-45`).
- Edge function: `git checkout <sha-anterior> -- supabase/functions/<nome>` +
  `supabase functions deploy <nome>` (`RUNBOOK.md:47-51`).
- Migration: forward-only — rollback é migration nova (`banco.md`).

## Env vars

Regra: **tudo com prefixo `VITE_` é embutido no bundle e vira público** (`.env.example:18-19`). Chave de
API vai em secret de Edge Function (`supabase secrets set` ou painel), nunca em `VITE_*`, nunca em env do
Vercel como se fosse segredo de servidor.

O código do front lê exatamente dois nomes obrigatórios (`src/integrations/supabase/client.ts:5-6`), e
`src/lib/envGuard.ts:11` pinta tela de erro se faltar um deles:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` — **não** `VITE_SUPABASE_ANON_KEY`; sem ela o build embarcava
  `createClient(url, undefined)` em silêncio (comentários em `ci.yml` e `deploy.yml`).

Também lidas pelo código: `VITE_APP_ENV`, `VITE_SENTRY_DSN`, `VITE_ALERT_WEBHOOK_URL`,
`VITE_MASTER_API_DISPLAY_KEY`, `VITE_VAPID_PUBLIC_KEY`, `VITE_E2E_TEST_HOOKS` (esta só no CI).
Server/edge (nunca `VITE_*`): `BITRIX24_*`, `RESEND_API_KEY`, `TWILIO_*`.

Divergências reais entre templates e código, para não te enganarem:

- `VITE_VAPID_PUBLIC_KEY` é lida em `src/features/notifications/hooks/usePushSubscription.ts` com
  fallback hardcoded e **não está em nenhum arquivo de env nem em secret**.
- Declaradas nos templates e **não lidas** em `src/`: `VITE_SUPABASE_PROJECT_ID`, `VITE_APP_DEBUG`,
  `VITE_GOOGLE_MAPS_API_KEY`, `VITE_GOOGLE_ANALYTICS_ID`.
- `.gitignore:27-30` ignora `.env.production`/`.env.staging` e manda usar `*.example`, que não existem —
  os dois arquivos versionados são templates sem valor real.

## Headers, CSP e SEO

`vercel.json` é quem define, em produção: rewrite SPA `/(.*) → /index.html`, `Cache-Control: immutable`
em `/assets/(.*)`, headers de segurança e a CSP real (o `<meta>` do `index.html` é só para o dev server).
`connect-src` libera `https://*.supabase.co` e `https://supabase.atomicabr.com.br`; `report-uri` aponta
para a edge `csp-report`.

- **Página em branco depois de deploy** quase sempre é CSP: console do browser → diretiva violada →
  ajustar `vercel.json` (`RUNBOOK.md:85`).
- `index.html` ainda tem `canonical`, `og:url`, `og:image`, `twitter:*` apontando para o **preview da
  Lovable**, não para o domínio de produção. É lixo de origem, não configuração intencional.
