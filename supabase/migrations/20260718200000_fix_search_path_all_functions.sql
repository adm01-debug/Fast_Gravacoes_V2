-- Segurança: garante search_path=public, pg_temp em TODAS as funções do schema public.
--
-- Contexto: as migrações 20260512143124 / 20260512213257 / 20260514211416 aplicaram
-- search_path=public em lote, mas apenas às funções que já existiam naquele momento.
-- Funções SECURITY DEFINER criadas DEPOIS (ex.: log_job_status_change,
-- check_and_notify_kpi_alert em 20260516172507; validate_stock_before_movement em
-- 20260514211903, criada minutos após o loop daquele mesmo dia) ficaram com
-- search_path mutável — um SECURITY DEFINER com search_path não fixado e referências
-- não qualificadas a schema pode ser sequestrado por um objeto de mesmo nome criado
-- antes no caminho de busca (ex.: em pg_temp), rodando código arbitrário com o
-- privilégio do dono da função (escalonamento de privilégio).
--
-- Esta migração é idempotente e cobre tanto os 3 ofensores confirmados quanto
-- qualquer função futura que venha a ser criada sem search_path fixado — deve
-- permanecer como a ÚLTIMA migração de segurança do tipo, ou ser reexecutada
-- sempre que novas funções forem adicionadas sem SET search_path explícito.
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN
        SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          -- só funções que ainda não têm search_path fixado em proconfig
          AND NOT EXISTS (
              SELECT 1 FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) cfg
              WHERE cfg LIKE 'search_path=%'
          )
    LOOP
        BEGIN
            EXECUTE format(
                'ALTER FUNCTION public.%I(%s) SET search_path = public, pg_temp',
                func_record.proname,
                func_record.args
            );
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Não foi possível alterar a função %: %', func_record.proname, SQLERRM;
        END;
    END LOOP;
END $$;
