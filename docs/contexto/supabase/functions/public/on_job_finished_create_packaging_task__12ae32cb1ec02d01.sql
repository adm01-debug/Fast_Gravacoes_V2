CREATE OR REPLACE FUNCTION public.on_job_finished_create_packaging_task()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'finished') THEN
    INSERT INTO public.packaging_tasks (job_id, status, received_quantity)
    VALUES (
      NEW.id,
      'pending',
      COALESCE(NEW.produced_quantity, NEW.quantity, 0)
    )
    ON CONFLICT (job_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$
