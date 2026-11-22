CREATE OR REPLACE FUNCTION public.trigger_send_tpm_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_base_url text := app_private.runtime_config_get('functions_base_url');
BEGIN
  IF coalesce(v_base_url, '') = '' THEN
    RAISE WARNING 'runtime_config.functions_base_url não configurado — webhook TPM ignorado neste ambiente';
    RETURN NEW;
  END IF;
  BEGIN
    PERFORM
      net.http_post(
        url := v_base_url || '/send-tpm-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', coalesce(app_private.runtime_config_get('cron_secret'), ''),
          'Authorization', 'Bearer ' || coalesce(app_private.runtime_config_get('service_role_key'), '')
        ),
        body := jsonb_build_object(
          'event_type', 'INSERT',
          'record', row_to_json(NEW)
        )::jsonb
      );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'trigger_send_tpm_email: falha ao notificar (%)', SQLERRM;
  END;
  RETURN NEW;
END;
$function$
