-- Function to call the edge function via HTTP
CREATE OR REPLACE FUNCTION public.notify_tpm_email()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER

-- Note: In Supabase, the best way is to use the Dashboard Webhooks.
-- However, since I don't have access to the Dashboard UI, I'll provide the SQL
-- that Supabase uses internally for webhooks if possible, or just leave the trigger hook.

-- Create a webhook (Standard Supabase approach for migrations)
-- This requires the 'net' extension which is usually enabled.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    CREATE EXTENSION "pg_net";
  END IF;
END $$

CREATE OR REPLACE FUNCTION public.trigger_send_tpm_email()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM
    net.http_post(
      url := 'https://whnnzdreuwxczxelvqjh.supabase.co/functions/v1/send-tpm-email',
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)),
      body := jsonb_build_object(
        'event_type', 'INSERT',
        'record', row_to_json(NEW)
      )::jsonb
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER

-- Uncomment the line below if you want to enable the trigger (requires service_role_key in settings)
-- DROP TRIGGER IF EXISTS on_maintenance_alert_insert ON public.maintenance_alerts;
-- CREATE TRIGGER on_maintenance_alert_insert
--   AFTER INSERT ON public.maintenance_alerts
--   FOR EACH ROW EXECUTE FUNCTION public.trigger_send_tpm_email();
