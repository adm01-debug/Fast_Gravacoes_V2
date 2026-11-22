-- Set search_path and revoke public execute for the trigger function
ALTER FUNCTION public.trigger_auto_promotion() SET search_path = public

REVOKE EXECUTE ON FUNCTION public.trigger_auto_promotion() FROM PUBLIC

GRANT EXECUTE ON FUNCTION public.trigger_auto_promotion() TO postgres, service_role
