CREATE OR REPLACE FUNCTION public.on_job_cancelled_hold_packaging()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
    UPDATE public.packaging_tasks
    SET status = 'on_hold', updated_at = now()
    WHERE job_id = NEW.id
      AND status NOT IN ('ready_to_ship');
  END IF;
  RETURN NEW;
END;
$function$
