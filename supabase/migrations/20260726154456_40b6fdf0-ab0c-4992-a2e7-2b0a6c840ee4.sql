REVOKE ALL ON FUNCTION public.snapshot_cron_health() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.snapshot_cron_health() TO service_role, postgres;

REVOKE ALL ON FUNCTION public.cron_expected_interval_minutes(TEXT) FROM PUBLIC, anon;
