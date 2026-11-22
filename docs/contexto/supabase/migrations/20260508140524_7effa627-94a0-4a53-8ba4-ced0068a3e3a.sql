-- Function for parameter alert notifications
CREATE OR REPLACE FUNCTION public.handle_parameter_alert_notification()
RETURNS TRIGGER AS $$
DECLARE
  rec_user RECORD;
  var_machine_id UUID;
  var_machine_name TEXT;
  var_machine_code TEXT;
  var_email TEXT;
BEGIN
  -- Get execution and machine info
  SELECT mr.machine_id, m.name, m.code INTO var_machine_id, var_machine_name, var_machine_code
  FROM maintenance_records mr
  JOIN machines m ON m.id = mr.machine_id
  WHERE mr.id = NEW.execution_id;

  -- Notify users who have TPM alerts enabled
  FOR rec_user IN 
    SELECT user_id, email_enabled, push_enabled 
    FROM user_notification_settings 
    WHERE 'tpm_alerts' = ANY(notification_types)
  LOOP
    -- In-app notification
    IF rec_user.push_enabled THEN
      INSERT INTO push_notifications (user_id, title, body, data)
      VALUES (
        rec_user.user_id,
        'Desvio de Parâmetro: ' || var_machine_code,
        'A máquina ' || var_machine_name || ' apresentou desvio no parâmetro ' || NEW.parameter_name || '. Valor: ' || NEW.recorded_value,
        jsonb_build_object('execution_id', NEW.execution_id, 'type', 'parameter_alert')
      );
    END IF;

    -- Email notification queue
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
END;
$$ LANGUAGE plpgsql SET search_path = public

-- Trigger for parameter alerts
DROP TRIGGER IF EXISTS tr_parameter_alert_notification ON public.tpm_parameter_alerts

CREATE TRIGGER tr_parameter_alert_notification
AFTER INSERT ON public.tpm_parameter_alerts
FOR EACH ROW
EXECUTE FUNCTION public.handle_parameter_alert_notification()

-- Function for correction requested notifications
CREATE OR REPLACE FUNCTION public.handle_maintenance_correction_notification()
RETURNS TRIGGER AS $$
DECLARE
  var_machine_name TEXT;
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'correction_requested') THEN
    SELECT name INTO var_machine_name FROM machines WHERE id = NEW.machine_id;
    
    -- Notify the technician
    INSERT INTO push_notifications (user_id, title, body, data)
    VALUES (
      NEW.performed_by,
      'Correção Solicitada: ' || COALESCE(var_machine_name, 'Máquina'),
      'O supervisor solicitou uma correção para a manutenção realizada. Motivo: ' || COALESCE(NEW.correction_notes, 'N/A'),
      jsonb_build_object('record_id', NEW.id, 'type', 'correction_requested')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public

-- Trigger for correction requests
DROP TRIGGER IF EXISTS tr_maintenance_correction_notification ON public.maintenance_records

CREATE TRIGGER tr_maintenance_correction_notification
AFTER UPDATE ON public.maintenance_records
FOR EACH ROW
EXECUTE FUNCTION public.handle_maintenance_correction_notification()
