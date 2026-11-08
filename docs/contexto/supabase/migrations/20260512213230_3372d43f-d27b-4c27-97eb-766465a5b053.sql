-- Revogação massiva de permissões públicas para todas as funções do esquema public
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
        EXECUTE 'REVOKE EXECUTE ON FUNCTION public.' || func_record.proname || '(' || func_record.args || ') FROM PUBLIC';
    END LOOP;
END $$

-- Re-concedendo permissões controladas para RPCs usados pelo frontend
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated

GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated

GRANT EXECUTE ON FUNCTION public.verify_audit_chain() TO authenticated

GRANT EXECUTE ON FUNCTION public.verify_audit_chain(integer) TO authenticated

GRANT EXECUTE ON FUNCTION public.increment_sheet_view_count(uuid) TO authenticated

GRANT EXECUTE ON FUNCTION public.refresh_operator_rankings(text) TO authenticated

GRANT EXECUTE ON FUNCTION public.calculate_days_of_supply() TO authenticated
