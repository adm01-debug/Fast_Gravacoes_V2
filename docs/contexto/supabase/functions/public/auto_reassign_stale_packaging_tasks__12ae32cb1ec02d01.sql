CREATE OR REPLACE FUNCTION public.auto_reassign_stale_packaging_tasks()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    UPDATE public.packaging_tasks
    SET assigned_to = NULL,
        status = 'pending',
        notes = concat(notes, '\n[AUTO] Reatribuído por inatividade em ', now())
    WHERE status IN ('packaging', 'in_triage')
      AND (
          (updated_at < now() - interval '30 minutes')
          OR 
          (started_at < now() - interval '2 hours' AND completed_at IS NULL)
      );
END;
$function$
