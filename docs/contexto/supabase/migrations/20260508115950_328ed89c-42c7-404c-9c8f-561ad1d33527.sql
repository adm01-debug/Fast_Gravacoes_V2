-- Set secure search_path for the notification functions
ALTER FUNCTION public.notify_tpm_email() SET search_path = public

ALTER FUNCTION public.trigger_send_tpm_email() SET search_path = public

-- Enable the trigger to actually send the emails
DROP TRIGGER IF EXISTS on_maintenance_alert_insert ON public.maintenance_alerts

CREATE TRIGGER on_maintenance_alert_insert
  AFTER INSERT ON public.maintenance_alerts
  FOR EACH ROW EXECUTE FUNCTION public.trigger_send_tpm_email()
