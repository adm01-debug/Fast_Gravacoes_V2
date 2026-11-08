# Banco de dados — referência para agentes

Ler quando for rodar SQL, criar ou aplicar migration, mexer em RLS, ou confirmar o que existe de verdade
no banco. Resumo das regras está em `AGENTS.md`; aqui está o detalhe. Errar o banco neste projeto já
causou retrabalho real (ver `docs/post-mortems/2026-09-10-migrate-helper.md`).

## Banco OFICIAL

Supabase Cloud **`uoujzvpecohinketylud`** ("Fast Gravações - V2"). É o alvo de `supabase/config.toml:1`
e de todos os workflows, pelo secret `SUPABASE_PROJECT_ID`; `deploy.yml` falha de propósito se o secret
divergir do `config.toml` (`.github/workflows/deploy.yml:128-132`). Produção confirmada pelo dono em
11/09/2026 (`supabase/ENVIRONMENTS.md:6-10`).

Diagnóstico em produção é **só leitura**. Teste que precisa escrever vai em Postgres descartável.

### Refs que NÃO são deste projeto (nunca escrever neles)

`supabase/ENVIRONMENTS.md:8-13`:

| Ref | O que é |
|---|---|
| `xxroejpvloldkmqdydar` | Legado (migration histórica `20260512110942…`). Nunca como alvo de deploy. |
| `whnnzdreuwxczxelvqjh` | Desconhecido/Lovable antigo (migration `20260508115941…`, função que não existe). |
| `fsisdfdwlbfeadwfqpir` | **Outro sistema** (Visão — câmeras/PPE). Não aparece neste repo; é o MCP vizinho. |

A estação tem MCP de vários projetos com nome parecido: **confira o `project_id` da conexão antes de
qualquer operação** (`supabase/ENVIRONMENTS.md:24-25`).

> **Divergência aberta, não resolvida aqui:** `docs/adr/0001-supabase-self-hosted-unico.md:8-14`
> (aceito 2026-10-01) declara `https://supabase.atomicabr.com.br` como único backend válido, enquanto o
> código em vigor (`supabase/config.toml:1`, `deploy.yml`, `contexto.yml`) aponta para o projeto cloud
> acima. `.env.production`/`.env.staging` só têm placeholder — a URL real vive em secret da Vercel/GitHub.
> Trate o ADR como histórico a retificar, siga o `config.toml`, e chame o dono antes de mudar de alvo.

## Estado real ≠ histórico do repo

**Migration no repo é histórico, não estado.** São 243 arquivos em `supabase/migrations/`, parte deles
gerada pelo Lovable, e o banco também foi construído por outros canais (SQL Editor) — o arquivo existir
não prova que o objeto existe.

O estado real está na branch gerada **`contexto`**, em `docs/contexto/supabase/` (snapshot de catálogo:
tabelas, colunas, policies, funções com corpo, triggers, cron, storage, grants, lints). Como ler sem
trocar de branch:

```bash
git fetch origin contexto
git show origin/contexto:docs/contexto/00-INDEX.md
git show origin/contexto:docs/contexto/supabase/tables/public/<tabela>.md
git show origin/contexto:docs/contexto/supabase/lints.md   # antes de mexer em RLS/função/índice
```

Produtor: `scripts/supabase_snapshot/snapshot.py`, sessão `default_transaction_read_only = on`, no job
`banco` do `.github/workflows/contexto.yml` (push em `main` + a cada 10 min). Frescor e coleta parcial:
`manifest.json` e `errors.md` da própria pasta. Detalhes: `scripts/supabase_snapshot/README.md`,
`docs/agentes/contexto.md`. Neste repo o snapshot **não** gera `schema.sql` nem `types.ts`.

## RLS

1. **Meça no banco, não no grep.** `grep` em `supabase/migrations/` mede histórico: 170 ocorrências de
   `USING true` por grep contra 4 policies realmente permissivas em 326 policies ativas / 137 tabelas
   (`docs/estado/rls-inventario.md:3-11`, consulta de 2026-09-24 — reconfira no snapshot).
2. **Padrão de autorização de fato**: função `SECURITY DEFINER`, `STABLE`, `SET search_path = public`,
   lendo `public.user_roles`. As funções reais mais usadas são `public.has_role(_user_id uuid, _role
   app_role)` e `public.has_any_active_role()`; `get_user_role(_user_id uuid)` aparece menos.
   `is_admin`/`has_permission` **não existem** nas migrations. Papéis: enum `public.app_role`
   (`coordinator`, `operator`, `manager`, + `admin`).
3. **Tabela ou coluna nova precisa de RLS** e de policy por operação. SELECT combina por `OR`: uma policy
   `true` anula as restritas da mesma tabela (`rls-inventario.md:18,48-50`).
4. **Grant é parte da policy.** Padrão recente: `REVOKE EXECUTE … FROM public, anon, authenticated` +
   `GRANT … TO service_role`; as policies chamam o helper via `SECURITY DEFINER`.
5. `public.exec_sql(text)` é infraestrutura em uso (gateway MCP) com `EXECUTE` só para `postgres` e
   `service_role` — **não remover** e nunca conceder a `authenticated` (`docs/estado/exec-sql-acl.md`).
6. Não confie em `test_rls_policies()` como cobertura: só checa GRANT de tabela, não a policy
   (`scripts/rls-regression.mjs:14-24`). O gate real de CI é um teste negativo único
   (`node scripts/rls-regression.mjs`: INSERT em nome de outro usuário precisa falhar com 42501).

## Regras de migration

1. Nome: `<timestamp 14 dígitos>_<slug>.sql` em `supabase/migrations/`. SQL fora de `migrations/`
   (`supabase/fix_*.sql`, `seed.sql`, …) **não** é aplicado por ninguém — não conte com ele.
2. Fluxo único: arquivo na branch → PR → merge em `main` → `deploy.yml` roda
   `supabase db push --project-ref … --yes` (`deploy.yml:170`) e só depois `supabase functions deploy`
   (`:221`). Nunca aplique DDL de branch aberta nem pelo painel.
3. DDL/migration em produção = **PR aberta e chame o dono** (item 8 do Fluxo Git, em `AGENTS.md`). Não
   mergeie sozinho.
4. **Forward-only**: nunca edite migration já aplicada; rollback é migration nova que desfaz. Nunca
   `db reset` em produção (`docs/operacoes/RUNBOOK.md:53-56`).
5. Migration nunca vai sozinha: o código que depende dela entra na mesma janela de deploy
   (`docs/operacoes/RUNBOOK.md:33-34`).
6. Proibido embutir URL absoluta de projeto em migration; cron recebe a URL do ambiente, não ref
   congelado em SQL (`supabase/ENVIRONMENTS.md:21-23`).
7. `src/integrations/supabase/client.ts` e `src/integrations/supabase/types.ts` são gerados — não editar
   à mão (o próprio cabeçalho do arquivo avisa).
8. Query em tabela que cresce usa `src/lib/fetchAllRows.ts`: o PostgREST corta em ~1000 linhas em
   silêncio e `.limit(N>1000)` não resolve (`docs/adr/0003-fetchallrows-paginacao.md`).
9. Trocar `verify_jwt` de uma função em `supabase/config.toml` é alteração real de gateway — valide contra
   o projeto canônico, nunca só por leitura de código (`supabase/config.toml:21-23`).
10. Destrutivo (DROP, DELETE em massa), segredo e rotação de chave: só com o dono.

## Workflows que tocam o banco

- `deploy.yml` (`push` em `main` + dispatch) — único caminho automático: `validate-supabase` (dry-run,
  qualquer ref) → `apply-migrations` (só `main`) → `deploy-edge-functions` (só `main`).
- `db-admin.yml` (**dispatch only**) — `mode: inspect` (leitura, qualquer ref; GUC mascarado) ou `mode: apply` (**só
  `main`**): grava `app.settings.functions_base_url`, rotaciona `CRON_SECRET`, define
  `CSP_REPORT_ALLOWED_HOSTS`, reinstala o cron `auto-promote-jobs-fallback`.
- `migration-repair.yml` (**dispatch only**) — marca como `applied` as migrations locais mais antigas que a última versão
  remota, para desbloquear `db push`; `inspect_only: true` só dumpa o schema remoto. Rodar uma vez e
  disparar o Deploy em seguida.

## Backup e restore

`docs/operacoes/RUNBOOK.md:58-79`: backup é `pg_dump --format=custom` agendado no painel (retenção
7 dias / 4 semanas / 12 meses, cópia fora do host); a function `backup-scheduler` existe mas **sem
evidência de agendamento ativo**. Restore é drill trimestral obrigatório em Postgres descartável
(`pg_restore --clean --if-exists`, conferir contagens de `jobs`/`profiles`/`audit_log`/`production_lots`,
registrar em `docs/operacoes/drills/`). Metas: RPO ≤ 24h, RTO ≤ 2h. Não há PITR automático confirmado.
