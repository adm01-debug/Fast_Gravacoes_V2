-- Script para aplicar search_path=public a todas as funções no esquema public
DO $$ 
DECLARE 
    func_record RECORD;
BEGIN 
    FOR func_record IN 
        SELECT p.proname, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
    LOOP 
        BEGIN
            EXECUTE 'ALTER FUNCTION public.' || func_record.proname || '(' || func_record.args || ') SET search_path = public';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Não foi possível alterar a função %: %', func_record.proname, SQLERRM;
        END;
    END LOOP;
END $$
