-- Corrigindo funções SECURITY DEFINER identificadas com search_path ausente.
-- Algumas eram criadas manualmente no ambiente legado e não pertencem à cadeia
-- versionada; `to_regprocedure` mantém a migration aplicável em banco limpo.
DO $$
DECLARE
  function_signature text;
BEGIN
  FOREACH function_signature IN ARRAY ARRAY[
    'public.log_technical_sheet_change()',
    'public.handle_new_user()',
    'public.audit_technical_sheet_changes()',
    'public.update_inventory_stock()',
    'public.increment_sheet_view_count(uuid)',
    'public.notify_tpm_email()',
    'public.notify_loss_risk()',
    'public.check_job_overlap()',
    'public.get_user_role(uuid)',
    'public.trigger_auto_promotion()',
    'public.audit_trigger_func()',
    'public.has_role(uuid, public.app_role)',
    'public.trigger_send_tpm_email()',
    'public.audit_tpm_execution_changes()',
    'public.log_role_changes()',
    'public.create_technical_sheet_version()',
    'public.audit_logistics_changes()'
  ] LOOP
    IF to_regprocedure(function_signature) IS NOT NULL THEN
      EXECUTE format('ALTER FUNCTION %s SET search_path = public', function_signature);
    END IF;
  END LOOP;
END
$$;

-- Restringindo inserção de logs de erro para usuários autenticados (prevenção de DOS)
DROP POLICY IF EXISTS "Anyone can insert error logs" ON public.error_logs;
CREATE POLICY "Authenticated users can insert error logs" 
ON public.error_logs FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Garantir que técnicas sempre tenham uma cor válida se não fornecida
ALTER TABLE public.techniques ALTER COLUMN color SET DEFAULT '#3b82f6';
