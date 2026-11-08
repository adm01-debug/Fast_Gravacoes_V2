-- Table for energy consumption data
CREATE TABLE public.energy_consumption (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  machine_id UUID REFERENCES public.machines(id),
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  consumption_kwh NUMERIC NOT NULL DEFAULT 0,
  power_factor NUMERIC,
  voltage NUMERIC,
  current_amps NUMERIC,
  peak_demand_kw NUMERIC,
  cost_per_kwh NUMERIC DEFAULT 0.65,
  total_cost NUMERIC GENERATED ALWAYS AS (consumption_kwh * cost_per_kwh) STORED,
  reading_type TEXT NOT NULL DEFAULT 'automatic',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Table for energy alerts/thresholds
CREATE TABLE public.energy_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  machine_id UUID REFERENCES public.machines(id),
  alert_type TEXT NOT NULL,
  threshold_value NUMERIC NOT NULL,
  current_value NUMERIC NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  message TEXT NOT NULL,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Table for energy targets/budgets
CREATE TABLE public.energy_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  machine_id UUID REFERENCES public.machines(id),
  technique_id TEXT,
  target_type TEXT NOT NULL,
  target_value NUMERIC NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Enable RLS
ALTER TABLE public.energy_consumption ENABLE ROW LEVEL SECURITY

ALTER TABLE public.energy_alerts ENABLE ROW LEVEL SECURITY

ALTER TABLE public.energy_targets ENABLE ROW LEVEL SECURITY

-- RLS Policies for energy_consumption
CREATE POLICY "Anyone can view energy consumption" 
ON public.energy_consumption FOR SELECT USING (true)

CREATE POLICY "Coordinators can manage energy consumption" 
ON public.energy_consumption FOR ALL 
USING (has_role(auth.uid(), 'coordinator'::app_role))
WITH CHECK (has_role(auth.uid(), 'coordinator'::app_role))

-- RLS Policies for energy_alerts
CREATE POLICY "Anyone can view energy alerts" 
ON public.energy_alerts FOR SELECT USING (true)

CREATE POLICY "System can manage energy alerts" 
ON public.energy_alerts FOR ALL USING (true) WITH CHECK (true)

-- RLS Policies for energy_targets
CREATE POLICY "Anyone can view energy targets" 
ON public.energy_targets FOR SELECT USING (true)

CREATE POLICY "Coordinators can manage energy targets" 
ON public.energy_targets FOR ALL 
USING (has_role(auth.uid(), 'coordinator'::app_role))
WITH CHECK (has_role(auth.uid(), 'coordinator'::app_role))

-- Trigger for updated_at
CREATE TRIGGER update_energy_targets_updated_at
  BEFORE UPDATE ON public.energy_targets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column()

-- Create indexes for better performance
CREATE INDEX idx_energy_consumption_machine ON public.energy_consumption(machine_id)

CREATE INDEX idx_energy_consumption_recorded_at ON public.energy_consumption(recorded_at)

CREATE INDEX idx_energy_alerts_machine ON public.energy_alerts(machine_id)

CREATE INDEX idx_energy_alerts_resolved ON public.energy_alerts(is_resolved)
