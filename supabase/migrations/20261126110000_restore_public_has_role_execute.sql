-- Alinha o repo a producao: public.has_role continua executavel por authenticated.
--
-- A migration 20260619160053 (_f360994f) revogou EXECUTE de public/anon/
-- authenticated em public.has_role(uuid, app_role) e concedeu apenas a
-- service_role, mas a producao manteve `authenticated=X/postgres` no
-- pg_proc.proacl (verificado via Management API) e as policies ainda dependem
-- dessa funcao: 150 apontam para app_private.has_role e 12 para public.has_role
-- (11 em storage.objects e 1 em public.erp_api_keys, medido em pg_depend).
--
-- Sem o grant, um ambiente reconstruido a partir das migrations falha com
-- "permission denied for function has_role" em qualquer acesso autenticado
-- as tabelas dessas 12 policies. O esquema preferencial segue sendo
-- app_private.has_role; aqui so restauramos o que a producao ja tem.
--
-- anon permanece sem EXECUTE: nenhuma das policies dependentes e `to anon`.
-- Decisao de negocio: nao abrir a funcao de RBAC para requisicoes anonimas.

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;