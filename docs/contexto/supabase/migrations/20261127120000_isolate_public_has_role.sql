-- Isola public.has_role: fecha a divida de RBAC registrada na #285.
--
-- Medido em producao (Management API, 24/11/2026) antes desta migration:
--   * 162 policies chamam has_role: 150 ja apontam para app_private.has_role e
--     12 ainda resolvem para public.has_role -- 11 em storage.objects
--     (production-photos, execution-evidence, tpm-evidences, tpm_signatures,
--     technical-documents) e 1 em public.erp_api_keys. A 20260619160053
--     reapontou apenas n.nspname = 'public' e deixou o schema storage inteiro
--     para tras;
--   * public.has_role(uuid, app_role) tem EXECUTE para PUBLIC, anon,
--     authenticated, postgres e service_role: qualquer requisicao anonima ou
--     autenticada a /rest/v1/rpc/has_role responde se um uuid qualquer possui
--     um papel, um oraculo de papeis exposto pela API;
--   * 4 funcoes SECURITY DEFINER (assign_packaging_task, get_cron_health,
--     record_packaging_defect, update_shipment_status) chamam
--     public.has_role de forma qualificada e seguem funcionando: executam com
--     privilegios do dono (postgres), que mantem EXECUTE apos a revogacao.
--
-- O que esta migration faz:
--   1) reaponta para app_private.has_role as policies que ainda usam a funcao
--      do schema exposto (replace exato do prefixo antes do regexp de nome
--      solto, sem o replace encadeado que duplicava o prefixo);
--   2) revoga EXECUTE de PUBLIC, anon e authenticated; postgres e service_role
--      continuam com acesso;
--   3) falha fechado: se sobrar policy dependente de public.has_role, ou se
--      algum corpo de funcao invoker chamar a funcao, aborta em vez de
--      derrubar o RBAC em producao.
--
-- Idempotente: expressoes ja migradas nao casam com o padrao e REVOKE de grant
-- inexistente nao tem efeito. A funcao public.has_role permanece no catalogo.

DO $$
DECLARE
  rec RECORD;
  novo_using TEXT;
  novo_check TEXT;
  total INT := 0;
BEGIN
  FOR rec IN
    SELECT n.nspname AS sch,
           c.relname AS tbl,
           p.polname AS pol,
           pg_get_expr(p.polqual, p.polrelid)      AS using_expr,
           pg_get_expr(p.polwithcheck, p.polrelid) AS check_expr
      FROM pg_policy p
      JOIN pg_class c ON c.oid = p.polrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
       AND (   pg_get_expr(p.polqual, p.polrelid)      ~ '(^|[^a-zA-Z0-9_.])has_role[[:space:]]*\('
            OR pg_get_expr(p.polwithcheck, p.polrelid) ~ '(^|[^a-zA-Z0-9_.])has_role[[:space:]]*\('
            OR pg_get_expr(p.polqual, p.polrelid)      ~ 'public\.has_role[[:space:]]*\('
            OR pg_get_expr(p.polwithcheck, p.polrelid) ~ 'public\.has_role[[:space:]]*\(')
     ORDER BY n.nspname, c.relname, p.polname
  LOOP
    novo_using := NULL;
    novo_check := NULL;

    IF rec.using_expr IS NOT NULL THEN
      novo_using := regexp_replace(
        replace(rec.using_expr, 'public.has_role(', 'app_private.has_role('),
        '(^|[^a-zA-Z0-9_.])has_role[[:space:]]*\(',
        '\1app_private.has_role(', 'g');
    END IF;

    IF rec.check_expr IS NOT NULL THEN
      novo_check := regexp_replace(
        replace(rec.check_expr, 'public.has_role(', 'app_private.has_role('),
        '(^|[^a-zA-Z0-9_.])has_role[[:space:]]*\(',
        '\1app_private.has_role(', 'g');
    END IF;

    EXECUTE (
      format('ALTER POLICY %I ON %I.%I', rec.pol, rec.sch, rec.tbl)
      || CASE WHEN novo_using IS NULL THEN '' ELSE format(' USING (%s)', novo_using) END
      || CASE WHEN novo_check IS NULL THEN '' ELSE format(' WITH CHECK (%s)', novo_check) END
    );
    total := total + 1;
  END LOOP;

  RAISE NOTICE 'policies reapontadas para app_private.has_role: %', total;
END $$

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role)
  FROM PUBLIC, anon, authenticated

-- anon: hoje ele avalia as 11 policies de storage porque public.has_role era
-- executavel por PUBLIC. app_private nao esta exposto no PostgREST e nao tem
-- grant de tabela para clientes, entao os grants abaixo restauram exatamente a
-- capacidade anterior (auth.uid() nulo => false) sem abrir oraculo de papeis.
GRANT USAGE ON SCHEMA app_private TO anon

GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) TO anon

DO $$
DECLARE
  pendentes INT;
  rec RECORD;
BEGIN
  SELECT count(*) INTO pendentes
    FROM pg_depend d
   WHERE d.refclassid = 'pg_proc'::regclass
     AND d.refobjid   = 'public.has_role(uuid, public.app_role)'::regprocedure
     AND d.classid    = 'pg_policy'::regclass;

  IF pendentes > 0 THEN
    RAISE EXCEPTION
      'RBAC: % policies ainda dependem de public.has_role; revogacao abortada', pendentes;
  END IF;

  FOR rec IN
    SELECT n.nspname || '.' || p.proname AS fn,
           p.prosecdef AS secdef,
           pg_get_userbyid(p.proowner) AS dono
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE p.prokind = 'f'
       AND n.nspname NOT IN ('pg_catalog', 'information_schema')
       AND p.proname <> 'has_role'
       AND (   pg_get_functiondef(p.oid) ~ '(^|[^a-zA-Z0-9_.])has_role[[:space:]]*\('
            OR pg_get_functiondef(p.oid) ~ 'public\.has_role[[:space:]]*\(')
  LOOP
    IF NOT rec.secdef THEN
      RAISE EXCEPTION
        'RBAC: funcao % chama public.has_role com privilegios do chamador; revogacao abortada', rec.fn;
    END IF;
    IF NOT has_function_privilege(rec.dono, 'public.has_role(uuid, public.app_role)', 'EXECUTE') THEN
      RAISE EXCEPTION
        'RBAC: dono % da funcao % ficou sem EXECUTE em public.has_role; revogacao abortada', rec.dono, rec.fn;
    END IF;
  END LOOP;

  IF NOT (   has_schema_privilege('anon', 'app_private', 'USAGE')
         AND has_function_privilege('anon', 'app_private.has_role(uuid, public.app_role)', 'EXECUTE')
         AND has_schema_privilege('authenticated', 'app_private', 'USAGE')
         AND has_function_privilege('authenticated', 'app_private.has_role(uuid, public.app_role)', 'EXECUTE')) THEN
    RAISE EXCEPTION
      'RBAC: anon/authenticated perderam acesso a app_private.has_role; as 162 policies quebrariam';
  END IF;

  IF    has_function_privilege('anon', 'public.has_role(uuid, public.app_role)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.has_role(uuid, public.app_role)', 'EXECUTE') THEN
    RAISE EXCEPTION
      'RBAC: public.has_role continua executavel por cliente; revogacao incompleta';
  END IF;
END $$
