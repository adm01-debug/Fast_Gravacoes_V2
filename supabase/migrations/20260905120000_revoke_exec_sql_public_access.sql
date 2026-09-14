-- Security hardening: revoga acesso público à exec_sql(text).
--
-- Contexto: exec_sql é o helper do Supabase-MCP que executa SQL arbitrário com
-- SECURITY DEFINER (owner: postgres). O grant padrão de EXECUTE para PUBLIC
-- a expunha via PostgREST (/rest/v1/rpc/exec_sql) para qualquer portador da
-- anon key (pública por design) — bypass completo de RLS/RBAC
-- (leitura/escrita/DDL, inclusive em auth.users).
--
-- Aplicada out-of-band (via MCP) em 2026-09-05 e registrada aqui para que
-- todos os ambientes converjam ao mesmo estado.
--
-- Idempotente E segura em banco limpo: a função pode não existir em ambientes
-- onde o helper Supabase-MCP nunca foi instalado — nesse caso não há nada a
-- revogar (o REVOKE seria um erro fatal na migração). O DO block só executa
-- os REVOKEs quando a assinatura exata exec_sql(text) está presente.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'exec_sql'
      AND pg_get_function_identity_arguments(p.oid) = 'text'
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.exec_sql(text) FROM PUBLIC, anon, authenticated;
  ELSE
    RAISE NOTICE 'exec_sql(text) não existe neste banco — nada a revogar (ok em banco limpo).';
  END IF;
END
$$;

-- Mesma postura para funções FUTURAS criadas em public por este role:
-- nunca expostas a anon/authenticated por padrão — grants são explícitos.
-- (ALTER DEFAULT PRIVILEGES não referencia objetos existentes, então é
-- sempre aplicável sem condicional.)
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM authenticated;
