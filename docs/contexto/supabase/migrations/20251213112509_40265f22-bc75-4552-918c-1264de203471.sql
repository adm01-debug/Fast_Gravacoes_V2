-- Create efficiency alerts history table
CREATE TABLE public.efficiency_alert_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type TEXT NOT NULL, -- 'bottleneck' or 'load_balancing'
  severity TEXT NOT NULL, -- 'warning', 'error', 'info'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  technique_id TEXT,
  machine_id UUID REFERENCES public.machines(id),
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  resolution_notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Enable RLS
ALTER TABLE public.efficiency_alert_history ENABLE ROW LEVEL SECURITY

-- Policies
CREATE POLICY "Anyone can view efficiency alert history"
ON public.efficiency_alert_history
FOR SELECT
USING (true)

CREATE POLICY "Authenticated users can insert alerts"
ON public.efficiency_alert_history
FOR INSERT
WITH CHECK (true)

CREATE POLICY "Authenticated users can update alerts"
ON public.efficiency_alert_history
FOR UPDATE
USING (true)

-- Index for faster queries
CREATE INDEX idx_efficiency_alerts_type ON public.efficiency_alert_history(alert_type)

CREATE INDEX idx_efficiency_alerts_detected ON public.efficiency_alert_history(detected_at DESC)

CREATE INDEX idx_efficiency_alerts_resolved ON public.efficiency_alert_history(resolved_at)
