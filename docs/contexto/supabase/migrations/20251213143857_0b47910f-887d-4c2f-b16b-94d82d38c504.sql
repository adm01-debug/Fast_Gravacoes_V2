-- Enable realtime for tables not yet added
ALTER PUBLICATION supabase_realtime ADD TABLE public.machines

ALTER PUBLICATION supabase_realtime ADD TABLE public.techniques

ALTER PUBLICATION supabase_realtime ADD TABLE public.efficiency_alert_history

-- Ensure all tables have REPLICA IDENTITY FULL for complete row data
ALTER TABLE public.jobs REPLICA IDENTITY FULL

ALTER TABLE public.machines REPLICA IDENTITY FULL

ALTER TABLE public.techniques REPLICA IDENTITY FULL

ALTER TABLE public.efficiency_alert_history REPLICA IDENTITY FULL

ALTER TABLE public.qr_scan_history REPLICA IDENTITY FULL
