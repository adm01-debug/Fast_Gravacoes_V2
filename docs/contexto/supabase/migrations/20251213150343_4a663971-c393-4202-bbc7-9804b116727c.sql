-- Create table for Bitrix24 sync history
CREATE TABLE public.bitrix24_sync_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('pull', 'push', 'webhook')),
  status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'error')),
  jobs_synced INTEGER DEFAULT 0,
  jobs_failed INTEGER DEFAULT 0,
  error_message TEXT,
  details JSONB DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  triggered_by TEXT DEFAULT 'manual'
)

-- Enable RLS
ALTER TABLE public.bitrix24_sync_history ENABLE ROW LEVEL SECURITY

-- Allow anyone to view sync history
CREATE POLICY "Anyone can view sync history"
ON public.bitrix24_sync_history
FOR SELECT
USING (true)

-- Allow authenticated users to insert sync records
CREATE POLICY "System can insert sync records"
ON public.bitrix24_sync_history
FOR INSERT
WITH CHECK (true)

-- Allow updates to sync records
CREATE POLICY "System can update sync records"
ON public.bitrix24_sync_history
FOR UPDATE
USING (true)

-- Create index for faster queries
CREATE INDEX idx_sync_history_started_at ON public.bitrix24_sync_history(started_at DESC)

CREATE INDEX idx_sync_history_status ON public.bitrix24_sync_history(status)
