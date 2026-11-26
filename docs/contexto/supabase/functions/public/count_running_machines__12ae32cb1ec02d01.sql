CREATE OR REPLACE FUNCTION public.count_running_machines()
 RETURNS bigint
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT COUNT(DISTINCT j.machine_id)
  FROM public.jobs j
  JOIN public.machines m ON m.id = j.machine_id
  WHERE j.status = 'production'
    AND j.machine_id IS NOT NULL
    AND m.is_active = true;
$function$
