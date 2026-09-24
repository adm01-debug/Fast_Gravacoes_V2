# Auditoria de ACL — `public.exec_sql(text)`

**Data da consulta:** 2026-09-24 · **Banco:** `uoujzvpecohinketylud` (produção canônica)

## Achado

`docs/plano-50-etapas-consolidacao.md` (Bloco A) alegava que `exec_sql` havia sido revogada. A auditoria de
2026-09-24 (`docs/plano-50-etapas-260924.md`, Etapa 1) encontrou a função **ainda presente** no banco canônico
e classificou isso inicialmente como crítico. Uma segunda verificação, feita antes de qualquer ação destrutiva,
mostrou que a alegação original também não procedia integralmente — a função nunca teve grant público.

## Evidência

```sql
SELECT p.proacl::text FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'exec_sql';
-- {postgres=X/postgres,service_role=X/postgres}

SELECT has_function_privilege('anon', 'public.exec_sql(text)', 'EXECUTE');         -- false
SELECT has_function_privilege('authenticated', 'public.exec_sql(text)', 'EXECUTE'); -- false
```

`exec_sql(text)` é `SECURITY DEFINER`, mas o `EXECUTE` está restrito a `postgres` (owner) e `service_role`.
**Não é alcançável via PostgREST/RPC por nenhum cliente autenticado com chave `anon` ou `authenticated`.**

## Interpretação

A função muito provavelmente é infraestrutura intencional consumida pelo próprio gateway MCP do Supabase
usado nesta organização (`SUPABASE - FAST GRAVAÇÕES - MCP`), cuja própria descrição instrui fazer bootstrap
de `exec_sql` "se ainda não existir" para viabilizar SQL arbitrário via `service_role` — não um artefato
esquecido do incidente `migrate-helper`. `service_role` tem privilégio elevado por desenho no Supabase; não é
uma superfície de exposição pública.

## Risco residual e ação

Não é uma vulnerabilidade ativa hoje (🟢, não mais 🔴). Risco residual real: se a `service_role key` vazar (o
próprio cenário do incidente `migrate-helper` — ver Etapa 2/3 do plano de 24/09) ou se um `GRANT EXECUTE ON
exec_sql TO authenticated` for aplicado por engano no futuro, a superfície volta a ser crítica. Recomendação:
manter a função (é infraestrutura em uso), mas travar contra regressão do grant — ver Etapa 1 revisada.

**Regressão em CI não implementada nesta sessão:** exigiria credencial de conexão direta ao Postgres
disponível no pipeline de CI, o que hoje não existe (a Etapa 6 do plano de 24/09 — secrets em GitHub
Environments — é pré-requisito real para isso, não estava mapeada como dependência no plano original).
Até lá, esta consulta deve ser reexecutada manualmente a cada auditoria periódica (ver Etapa 48, calendário
de manutenção).
