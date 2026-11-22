-- Fix Function Search Path and Revoke Public Execute for all functions
DO $$ 
DECLARE 
    func_record RECORD;
BEGIN 
    FOR func_record IN 
        SELECT n.nspname as schema, p.proname as name, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public'
    LOOP 
        -- Set search_path to public to prevent search path hijacking
        EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public', func_record.schema, func_record.name, func_record.args);
        
        -- Revoke execute from public
        EXECUTE format('REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC', func_record.schema, func_record.name, func_record.args);
        
        -- Grant execute only to authenticated users (or specific roles if needed)
        EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated, service_role', func_record.schema, func_record.name, func_record.args);
    END LOOP; 
END $$

-- Fix Permissive RLS Policies
-- Ensure audit_log is strictly immutable and restricted
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY

DROP POLICY IF EXISTS "Anyone can view audit logs" ON public.audit_log

CREATE POLICY "Managers and Coordinators can view audit logs" 
ON public.audit_log 
FOR SELECT 
USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'coordinator'::app_role))

-- Ensure role management is restricted
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY

DROP POLICY IF EXISTS "Coordinators can manage user roles" ON public.user_roles

CREATE POLICY "Only managers can manage user roles" 
ON public.user_roles 
FOR ALL 
USING (has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'manager'::app_role))
