CREATE OR REPLACE FUNCTION public.handle_maintenance_correction_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$
