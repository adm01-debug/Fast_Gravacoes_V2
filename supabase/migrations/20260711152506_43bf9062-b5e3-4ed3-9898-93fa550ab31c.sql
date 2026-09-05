REVOKE EXECUTE ON FUNCTION public.has_any_active_role() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_active_role() TO service_role;