CREATE OR REPLACE FUNCTION public.notify_loss_risk()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_base_url text := app_private.runtime_config_get('functions_base_url');
BEGIN
  IF (NEW.severity = 'critical' OR NEW.alert_type = 'out_of_range') THEN
    IF coalesce(v_base_url, '') = '' THEN
      RAISE WARNING 'runtime_config.functions_base_url não configurado — alerta de risco de perda não notificado';
    ELSE
      BEGIN
        PERFORM
          net.http_post(
            url := v_base_url || '/send-loss-risk-alert',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'x-cron-secret', coalesce(app_private.runtime_config_get('cron_secret'), ''),
              'Authorization', 'Bearer ' || coalesce(app_private.runtime_config_get('service_role_key'), '')
            ),
            body := jsonb_build_object(
              'record', row_to_json(NEW),
              'event_type', 'INSERT'
            )
          );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'notify_loss_risk: falha ao notificar (%)', SQLERRM;
      END;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
