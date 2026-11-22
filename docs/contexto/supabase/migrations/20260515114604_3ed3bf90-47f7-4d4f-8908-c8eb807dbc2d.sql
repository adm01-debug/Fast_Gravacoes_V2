CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  event TEXT NOT NULL,
  payload JSONB,
  status_code INTEGER,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
)

-- Enable RLS
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY

-- Allow authenticated users (admins/coordinators) to read logs
CREATE POLICY "Allow service_role full access to webhook_logs" 
ON public.webhook_logs 
TO service_role 
USING (true) 
WITH CHECK (true)

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_webhook_logs_source ON public.webhook_logs (source)

CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON public.webhook_logs (created_at DESC)
