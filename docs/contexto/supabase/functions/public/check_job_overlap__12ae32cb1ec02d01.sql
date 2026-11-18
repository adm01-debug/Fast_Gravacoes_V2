CREATE OR REPLACE FUNCTION public.check_job_overlap()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    overlap_count INTEGER;
    machine_name TEXT;
BEGIN
    -- Update que nao altera o agendamento nem o estado de cancelamento nao pode
    -- ser barrado por um conflito que ja existia antes dele.
    IF TG_OP = 'UPDATE'
       AND NEW.machine_id IS NOT DISTINCT FROM OLD.machine_id
       AND NEW.scheduled_date IS NOT DISTINCT FROM OLD.scheduled_date
       AND NEW.start_time IS NOT DISTINCT FROM OLD.start_time
       AND NEW.end_time IS NOT DISTINCT FROM OLD.end_time
       AND (NEW.status = 'cancelled') IS NOT DISTINCT FROM (OLD.status = 'cancelled') THEN
        RETURN NEW;
    END IF;

    -- Only check for jobs with machine, date, and times assigned
    IF NEW.machine_id IS NULL OR NEW.scheduled_date IS NULL OR NEW.start_time IS NULL OR NEW.end_time IS NULL THEN
        RETURN NEW;
    END IF;

    -- Skip check if status is 'cancelled'
    IF NEW.status = 'cancelled' THEN
        RETURN NEW;
    END IF;

    -- Check for overlaps
    -- Assuming start_time and end_time are in 'HH:mm' format (text comparison works)
    SELECT COUNT(*)
    INTO overlap_count
    FROM public.jobs
    WHERE machine_id = NEW.machine_id
      AND scheduled_date = NEW.scheduled_date
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND status != 'cancelled'
      AND (
        (NEW.start_time < end_time AND NEW.end_time > start_time)
      );

    IF overlap_count > 0 THEN
        -- Try to get machine name for better error message
        SELECT name INTO machine_name FROM public.machines WHERE id = NEW.machine_id;
        RAISE EXCEPTION 'Conflito de agendamento: A maquina % ja possui um job agendado entre % e % nesta data.',
            COALESCE(machine_name, NEW.machine_id::text),
            NEW.start_time,
            NEW.end_time;
    END IF;

    RETURN NEW;
END;
$function$
