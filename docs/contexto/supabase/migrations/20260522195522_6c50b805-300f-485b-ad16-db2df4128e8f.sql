DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.log_technical_sheet_change()',
    'public.validate_inventory_stock()',
    'public.log_security_violation()',
    'public.handle_new_user()',
    'public.audit_technical_sheet_changes()',
    'public.validate_stock_before_movement()',
    'public.update_inventory_stock()',
    'public.notify_tpm_email()',
    'public.audit_logistics_changes()',
    'public.notify_loss_risk()',
    'public.audit_machine_changes()',
    'public.trigger_auto_promotion()',
    'public.check_job_overlap()',
    'public.audit_trigger_func()',
    'public.audit_tpm_execution_changes()',
    'public.trigger_send_tpm_email()',
    'public.log_role_changes()',
    'public.create_technical_sheet_version()',
    'public.audit_job_status_change()',
    'public.audit_job_changes()',
    'public.log_job_status_change()'
  ]
  LOOP
    EXECUTE 'REVOKE EXECUTE ON FUNCTION ' || fn || ' FROM anon, authenticated, public';
  END LOOP;
END$$
