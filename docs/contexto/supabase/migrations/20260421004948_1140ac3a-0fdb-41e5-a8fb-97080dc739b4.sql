-- Remove INSERT policy permissivo: triggers SECURITY DEFINER já bypassa RLS,
-- então clientes nunca devem inserir diretamente no audit_log.
DROP POLICY IF EXISTS "System can insert audit records" ON public.audit_log
