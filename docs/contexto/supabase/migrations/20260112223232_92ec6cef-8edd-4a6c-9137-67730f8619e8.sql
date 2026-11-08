-- Enable realtime on tables used by NotificationsPage realtime subscriptions
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_alerts;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.machine_predictions;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_summaries;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$
