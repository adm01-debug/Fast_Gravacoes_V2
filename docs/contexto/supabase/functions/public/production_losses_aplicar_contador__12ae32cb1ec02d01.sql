CREATE OR REPLACE FUNCTION public.production_losses_aplicar_contador()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  PERFORM public.increment_job_lost_pieces(NEW.job_id, NEW.quantity);
  RETURN NEW;
END;
$function$
