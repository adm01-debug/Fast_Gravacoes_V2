CREATE OR REPLACE FUNCTION public.archive_finished_jobs(p_older_than timestamp with time zone)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.archive_jobs(p_older_than => p_older_than);
$function$
