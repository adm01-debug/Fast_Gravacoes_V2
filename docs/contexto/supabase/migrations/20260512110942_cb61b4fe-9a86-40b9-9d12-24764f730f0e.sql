-- Enable pg_net to call edge functions from triggers
CREATE EXTENSION IF NOT EXISTS pg_net

-- Create a function to trigger the edge function
CREATE OR REPLACE FUNCTION public.trigger_auto_promotion()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the edge function asynchronously
  -- We use net.http_post to call the function
  -- The URL is constructed using the project's internal reference if possible, 
  -- but usually we use the direct edge function URL.
  -- In Lovable/Supabase environment, we can use the project URL.
  PERFORM net.http_post(
    url := 'https://' || current_setting('request.headers')::json->>'host' || '/functions/v1/auto-promote-jobs',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER

-- Create the trigger on the jobs table
-- Trigger when a job status changes to 'finished'
DROP TRIGGER IF EXISTS on_job_finished_promote ON public.jobs

CREATE TRIGGER on_job_finished_promote
AFTER UPDATE OF status ON public.jobs
FOR EACH ROW
WHEN (NEW.status = 'finished' AND OLD.status != 'finished')
EXECUTE FUNCTION public.trigger_auto_promotion()

-- Add indexes for performance of the promotion logic
CREATE INDEX IF NOT EXISTS idx_jobs_status_technique_priority ON public.jobs (status, technique_id, priority, created_at)

-- Fallback: Cron job to run every 5 minutes (if pg_cron is available)
-- Note: Some environments might not have pg_cron enabled by default.
-- We wrap it in a block to avoid errors if pg_cron is missing.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'auto-promote-jobs-fallback',
      '*/5 * * * *',
      'SELECT net.http_post(
        url := ''https://xxroejpvloldkmqdydar.supabase.co/functions/v1/auto-promote-jobs'',
        headers := jsonb_build_object(
          ''Content-Type'', ''application/json'',
          ''Authorization'', ''Bearer '' || current_setting(''app.settings.service_role_key'', true)
        ),
        body := ''{}''::jsonb
      )'
    );
  END IF;
END $$
