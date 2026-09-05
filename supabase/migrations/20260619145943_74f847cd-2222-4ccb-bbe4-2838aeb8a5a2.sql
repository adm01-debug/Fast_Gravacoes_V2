
-- webhook_logs: add manager-only SELECT policy (table had RLS enabled but no policies after cleanup)
CREATE POLICY "Managers can view webhook logs"
ON public.webhook_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'manager'));

-- Restrict audit chain verification to server-side (service_role) only
REVOKE EXECUTE ON FUNCTION public.verify_audit_chain() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.verify_audit_chain(integer) FROM PUBLIC, anon, authenticated;
