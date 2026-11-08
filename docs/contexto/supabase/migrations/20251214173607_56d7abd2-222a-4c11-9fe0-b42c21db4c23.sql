-- Create machine predictions table
CREATE TABLE public.machine_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  prediction_type TEXT NOT NULL, -- 'failure_risk', 'maintenance_needed', 'performance_degradation'
  risk_score NUMERIC(5,2) NOT NULL, -- 0-100
  confidence NUMERIC(5,2) NOT NULL, -- 0-100
  predicted_failure_date DATE,
  factors JSONB NOT NULL DEFAULT '[]', -- Contributing factors
  recommendations TEXT[],
  model_version TEXT NOT NULL DEFAULT 'v1.0',
  is_active BOOLEAN NOT NULL DEFAULT true,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days')
)

-- Create prediction history for tracking accuracy
CREATE TABLE public.prediction_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prediction_id UUID NOT NULL REFERENCES public.machine_predictions(id) ON DELETE CASCADE,
  machine_id UUID NOT NULL REFERENCES public.machines(id),
  predicted_risk_score NUMERIC(5,2) NOT NULL,
  predicted_failure_date DATE,
  actual_failure_date DATE,
  was_accurate BOOLEAN,
  accuracy_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
)

-- Create machine health metrics (aggregated data for ML)
CREATE TABLE public.machine_health_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_jobs INTEGER NOT NULL DEFAULT 0,
  total_produced INTEGER NOT NULL DEFAULT 0,
  total_losses INTEGER NOT NULL DEFAULT 0,
  total_production_hours NUMERIC(10,2) NOT NULL DEFAULT 0,
  maintenance_count INTEGER NOT NULL DEFAULT 0,
  corrective_maintenance_count INTEGER NOT NULL DEFAULT 0,
  avg_time_between_failures NUMERIC(10,2),
  avg_repair_time NUMERIC(10,2),
  oee_score NUMERIC(5,2),
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(machine_id, period_start, period_end)
)

-- Enable RLS
ALTER TABLE public.machine_predictions ENABLE ROW LEVEL SECURITY

ALTER TABLE public.prediction_history ENABLE ROW LEVEL SECURITY

ALTER TABLE public.machine_health_metrics ENABLE ROW LEVEL SECURITY

-- RLS Policies
CREATE POLICY "Anyone can view predictions" ON public.machine_predictions FOR SELECT USING (true)

CREATE POLICY "System can manage predictions" ON public.machine_predictions FOR ALL USING (true) WITH CHECK (true)

CREATE POLICY "Anyone can view prediction history" ON public.prediction_history FOR SELECT USING (true)

CREATE POLICY "System can manage prediction history" ON public.prediction_history FOR ALL USING (true) WITH CHECK (true)

CREATE POLICY "Anyone can view health metrics" ON public.machine_health_metrics FOR SELECT USING (true)

CREATE POLICY "System can manage health metrics" ON public.machine_health_metrics FOR ALL USING (true) WITH CHECK (true)
