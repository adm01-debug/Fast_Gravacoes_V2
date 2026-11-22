-- Fix function search paths for all security definer functions to prevent search_path injection attacks
-- And revoke public execute where appropriate

-- log_technical_sheet_change
ALTER FUNCTION public.log_technical_sheet_change() SET search_path = public

REVOKE EXECUTE ON FUNCTION public.log_technical_sheet_change() FROM PUBLIC

-- validate_inventory_stock
ALTER FUNCTION public.validate_inventory_stock() SET search_path = public

REVOKE EXECUTE ON FUNCTION public.validate_inventory_stock() FROM PUBLIC

-- log_security_violation
ALTER FUNCTION public.log_security_violation() SET search_path = public

REVOKE EXECUTE ON FUNCTION public.log_security_violation() FROM PUBLIC

-- test_rls_policies
ALTER FUNCTION public.test_rls_policies(text, uuid, text) SET search_path = public

REVOKE EXECUTE ON FUNCTION public.test_rls_policies(text, uuid, text) FROM PUBLIC

-- has_role
ALTER FUNCTION public.has_role(uuid, public.app_role) SET search_path = public

-- handle_new_user
ALTER FUNCTION public.handle_new_user() SET search_path = public

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC

-- audit_technical_sheet_changes
ALTER FUNCTION public.audit_technical_sheet_changes() SET search_path = public

REVOKE EXECUTE ON FUNCTION public.audit_technical_sheet_changes() FROM PUBLIC

-- Ensure execute is granted only to authenticated or service_role where needed
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role
