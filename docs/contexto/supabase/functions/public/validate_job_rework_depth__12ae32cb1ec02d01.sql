CREATE OR REPLACE FUNCTION public.validate_job_rework_depth()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  parent_parent_id UUID;
BEGIN
  IF NEW.parent_job_id IS NOT NULL THEN
    SELECT parent_job_id INTO parent_parent_id
    FROM public.jobs
    WHERE id = NEW.parent_job_id;
    IF parent_parent_id IS NOT NULL THEN
      RAISE EXCEPTION 'Cadeia de rework não pode ter mais de 2 níveis (pai já tem pai)';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
