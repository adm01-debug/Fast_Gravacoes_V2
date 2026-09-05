
REVOKE EXECUTE ON FUNCTION public.purge_old_logs() FROM anon;
REVOKE EXECUTE ON FUNCTION public.purge_old_logs() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.purge_old_logs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_old_logs() TO service_role;
