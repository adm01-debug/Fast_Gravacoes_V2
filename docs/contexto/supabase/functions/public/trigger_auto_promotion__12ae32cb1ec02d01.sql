CREATE OR REPLACE FUNCTION public.trigger_auto_promotion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_base_url text := app_private.runtime_config_get('functions_base_url');
BEGIN
  IF coalesce(v_base_url, '') = '' THEN
    RAISE WARNING 'runtime_config.functions_base_url não configurado — auto-promotion imediato ignorado';
    RETURN NEW;
  END IF;
  BEGIN
    PERFORM net.http_post(
      url := v_base_url || '/auto-promote-jobs',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', coalesce(app_private.runtime_config_get('cron_secret'), ''),
        'Authorization', 'Bearer ' || coalesce(app_private.runtime_config_get('service_role_key'), '')
      ),
      body := '{}'::jsonb
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'trigger_auto_promotion: falha ao notificar (%)', SQLERRM;
  END;
  RETURN NEW;
END;
$function$
