-- Create QR scan history table
CREATE TABLE public.qr_scan_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'start', 'pause', 'resume', 'finish', 'view'
  scanned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  device_info TEXT, -- Optional device/browser info
  notes TEXT
)

-- Enable RLS
ALTER TABLE public.qr_scan_history ENABLE ROW LEVEL SECURITY

-- Policy: All authenticated users can view scan history
CREATE POLICY "Authenticated users can view scan history"
ON public.qr_scan_history
FOR SELECT
TO authenticated
USING (true)

-- Policy: Authenticated users can insert their own scans
CREATE POLICY "Users can insert their own scans"
ON public.qr_scan_history
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = operator_id)

-- Create index for faster queries
CREATE INDEX idx_qr_scan_history_job_id ON public.qr_scan_history(job_id)

CREATE INDEX idx_qr_scan_history_operator_id ON public.qr_scan_history(operator_id)

CREATE INDEX idx_qr_scan_history_scanned_at ON public.qr_scan_history(scanned_at DESC)
