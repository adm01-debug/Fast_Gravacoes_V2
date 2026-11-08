-- Function to call the loss risk notification edge function
CREATE OR REPLACE FUNCTION public.notify_loss_risk()
RETURNS TRIGGER AS $$
BEGIN
  -- We only want to notify for critical alerts (loss risks)
  IF (NEW.severity = 'critical' OR NEW.alert_type = 'out_of_range') THEN
    PERFORM
      net.http_post(
        url := (SELECT value FROM secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/send-loss-risk-alert',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT value FROM secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
        ),
        body := jsonb_build_object(
          'record', row_to_json(NEW),
          'event_type', 'INSERT'
        )
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER

-- Trigger for new alerts
DROP TRIGGER IF EXISTS on_tpm_execution_alert ON public.tpm_execution_alerts

CREATE TRIGGER on_tpm_execution_alert
AFTER INSERT ON public.tpm_execution_alerts
FOR EACH ROW
EXECUTE FUNCTION public.notify_loss_risk()
