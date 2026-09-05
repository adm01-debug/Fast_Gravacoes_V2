
-- 1) Remove redundant service_role ALL/true policies (service_role bypasses RLS)
DROP POLICY IF EXISTS "Allow service role to manage test results" ON public.rls_test_results;
DROP POLICY IF EXISTS "Allow service_role full access to webhook_logs" ON public.webhook_logs;

-- 2) Tighten telemetry_traces INSERT: require authenticated user (no anon-style writes)
DROP POLICY IF EXISTS "Authenticated users can insert traces" ON public.telemetry_traces;
CREATE POLICY "Authenticated users can insert traces"
ON public.telemetry_traces
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- 3) Revoke EXECUTE on sensitive SECURITY DEFINER functions from public roles
REVOKE EXECUTE ON FUNCTION public.check_and_notify_kpi_alert(uuid, text, double precision, double precision, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.test_rls_policies(text, uuid, text) FROM PUBLIC, anon, authenticated;
