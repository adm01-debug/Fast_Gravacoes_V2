-- Aprovação de manutenção atômica: registro + agendamento + alertas numa
-- única transação. Antes, a aprovação e o avanço do schedule eram updates
-- separados — se o segundo falhava, o registro ficava 'approved' com
-- next_due_at obsoleto e a guarda status='completed' impedia retry.
--
-- SECURITY INVOKER: mantém as policies de RLS do chamador (a função só
-- encapsula as escritas; não escala privilégio).

CREATE OR REPLACE FUNCTION public.approve_maintenance_record(
  p_record_id uuid,
  p_approver_id uuid,
  p_next_due timestamptz,
  p_schedule_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
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
$$;

REVOKE ALL ON FUNCTION public.approve_maintenance_record(uuid, uuid, timestamptz, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_maintenance_record(uuid, uuid, timestamptz, uuid) TO authenticated;
