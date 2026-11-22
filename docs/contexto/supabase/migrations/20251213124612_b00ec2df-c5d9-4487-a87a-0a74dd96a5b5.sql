-- Enable realtime for qr_scan_history table
ALTER TABLE public.qr_scan_history REPLICA IDENTITY FULL

ALTER PUBLICATION supabase_realtime ADD TABLE public.qr_scan_history
