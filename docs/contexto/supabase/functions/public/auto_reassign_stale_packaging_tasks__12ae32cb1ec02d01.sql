CREATE OR REPLACE FUNCTION public.auto_reassign_stale_packaging_tasks()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.packaging_tasks
  SET assigned_to = NULL, updated_at = now()
  WHERE status IN ('pending', 'in_triage')
    AND assigned_to IS NOT NULL
    AND updated_at < now() - interval '30 minutes';
END;
$function$
