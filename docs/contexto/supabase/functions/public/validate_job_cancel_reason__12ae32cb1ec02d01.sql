CREATE OR REPLACE FUNCTION public.validate_job_cancel_reason()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.status = 'cancelled' AND (NEW.cancel_reason IS NULL OR trim(NEW.cancel_reason) = '') THEN
    RAISE EXCEPTION 'cancel_reason é obrigatório ao cancelar um job';
  END IF;
  RETURN NEW;
END;
$function$
