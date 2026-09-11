-- Revogando acesso público e concedendo apenas a usuários autenticados onde necessário
DO $$
DECLARE
  function_signature text;
BEGIN
  FOREACH function_signature IN ARRAY ARRAY[
    'public.log_technical_sheet_change()', 'public.handle_new_user()',
    'public.audit_technical_sheet_changes()', 'public.update_inventory_stock()',
    'public.increment_sheet_view_count(uuid)', 'public.notify_tpm_email()',
    'public.notify_loss_risk()', 'public.check_job_overlap()',
    'public.get_user_role(uuid)', 'public.trigger_auto_promotion()',
    'public.audit_trigger_func()', 'public.has_role(uuid, public.app_role)',
    'public.trigger_send_tpm_email()', 'public.audit_tpm_execution_changes()',
    'public.log_role_changes()', 'public.create_technical_sheet_version()',
    'public.audit_logistics_changes()', 'public.verify_audit_chain()',
    'public.verify_audit_chain(integer)'
  ] LOOP
    IF to_regprocedure(function_signature) IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', function_signature);
    END IF;
  END LOOP;
END
$$;

-- Concedendo acesso a usuários autenticados para RPCs chamados pelo frontend
DO $$
DECLARE
  function_signature text;
BEGIN
  FOREACH function_signature IN ARRAY ARRAY[
    'public.has_role(uuid, public.app_role)', 'public.get_user_role(uuid)',
    'public.verify_audit_chain()', 'public.verify_audit_chain(integer)',
    'public.increment_sheet_view_count(uuid)'
  ] LOOP
    IF to_regprocedure(function_signature) IS NOT NULL THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', function_signature);
    END IF;
  END LOOP;
END
$$;
