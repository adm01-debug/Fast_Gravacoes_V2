CREATE OR REPLACE FUNCTION public.notify_tpm_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  payload JSONB;
BEGIN
  payload := jsonb_build_object(
    'event_type', TG_OP,
    'record', row_to_json(NEW)
  );
  
  -- Use net.http_post if extension is available, otherwise this is just for reference
  -- In Lovable/Supabase environments, we typically use Database Webhooks in the UI
  -- but we can also set up a trigger if we have the net extension.
  -- For this project, I'll assume standard webhook setup or standard trigger logic.
  
  RETURN NEW;
END;
$function$
