REVOKE ALL ON FUNCTION public.get_cron_health() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_cron_health() TO authenticated, service_role;