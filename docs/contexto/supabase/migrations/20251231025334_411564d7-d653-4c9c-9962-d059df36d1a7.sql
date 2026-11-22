-- Enable realtime for password_reset_requests table
ALTER TABLE public.password_reset_requests REPLICA IDENTITY FULL

ALTER PUBLICATION supabase_realtime ADD TABLE public.password_reset_requests
