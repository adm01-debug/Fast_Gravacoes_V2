CREATE OR REPLACE FUNCTION public.approve_maintenance_record(p_record_id uuid, p_approver_id uuid, p_next_due timestamp with time zone, p_schedule_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Guarda atômica: só aprova quem ainda espera decisão.
  UPDATE public.maintenance_records
     SET status = 'approved',
         approver_id = p_approver_id,
         approved_at = now(),
         next_scheduled_date_after_approval = p_next_due
   WHERE id = p_record_id
     AND status = 'completed';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registro já foi processado por outra aprovação/correção';
  END IF;

  IF p_schedule_id IS NOT NULL THEN
    UPDATE public.maintenance_schedules
       SET last_completed_at = now(),
           next_due_at = p_next_due
     WHERE id = p_schedule_id;

    UPDATE public.maintenance_alerts
       SET is_resolved = true,
           resolved_at = now()
     WHERE schedule_id = p_schedule_id
       AND is_resolved = false;
  END IF;
END;
$function$
