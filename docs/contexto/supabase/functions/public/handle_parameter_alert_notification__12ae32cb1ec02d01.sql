CREATE OR REPLACE FUNCTION public.handle_parameter_alert_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  rec_user RECORD;
  var_machine_id UUID;
  var_machine_name TEXT;
  var_machine_code TEXT;
  var_email TEXT;
BEGIN
  SELECT mr.machine_id, m.name, m.code INTO var_machine_id, var_machine_name, var_machine_code
  FROM maintenance_records mr
  JOIN machines m ON m.id = mr.machine_id
  WHERE mr.id = NEW.execution_id;

  FOR rec_user IN
    SELECT user_id, email_enabled, push_enabled
    FROM user_notification_settings
    WHERE 'tpm_alerts' = ANY(notification_types)
  LOOP
    IF rec_user.push_enabled THEN
      INSERT INTO push_notifications (user_id, title, body, data)
      VALUES (
        rec_user.user_id,
        'Desvio de Parâmetro: ' || var_machine_code,
        'A máquina ' || var_machine_name || ' apresentou desvio no parâmetro ' || NEW.parameter_name || '. Valor: ' || NEW.recorded_value,
        jsonb_build_object('execution_id', NEW.execution_id, 'type', 'parameter_alert')
      );
    END IF;

    IF rec_user.email_enabled THEN
      SELECT email INTO var_email FROM auth.users WHERE id = rec_user.user_id;

      IF var_email IS NOT NULL THEN
        INSERT INTO tpm_notification_queue (machine_id, channel, severity, recipient, payload)
        VALUES (
          var_machine_id,
          'email',
          NEW.severity,
          var_email,
          jsonb_build_object(
            'type', 'parameter_deviation',
            'execution_id', NEW.execution_id,
            'parameter', NEW.parameter_name,
            'recorded_value', NEW.recorded_value,
            'recommended_range', NEW.recommended_range,
            'machine_name', var_machine_name,
            'machine_code', var_machine_code
          )
        );
      END IF;
    END IF;
  END LOOP;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_parameter_alert_notification: falha ao notificar (%)', SQLERRM;
  RETURN NEW;
END;
$function$
