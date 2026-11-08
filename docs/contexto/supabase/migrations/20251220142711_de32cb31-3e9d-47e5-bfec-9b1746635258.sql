-- =============================================
-- 2. MÓDULO SPC - CONTROLE ESTATÍSTICO DE PROCESSO
-- =============================================

-- Parâmetros de controle por produto/processo
CREATE TABLE public.spc_control_parameters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  product_name TEXT,
  technique_id TEXT,
  machine_id UUID REFERENCES public.machines(id) ON DELETE SET NULL,
  measurement_type TEXT NOT NULL, -- 'dimensional', 'weight', 'visual', 'temperature', 'pressure'
  unit TEXT NOT NULL DEFAULT 'mm',
  target_value NUMERIC NOT NULL,
  upper_spec_limit NUMERIC NOT NULL, -- USL
  lower_spec_limit NUMERIC NOT NULL, -- LSL
  upper_control_limit NUMERIC, -- UCL (calculado)
  lower_control_limit NUMERIC, -- LCL (calculado)
  sample_size INTEGER NOT NULL DEFAULT 5,
  frequency_minutes INTEGER NOT NULL DEFAULT 60,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Medições SPC
CREATE TABLE public.spc_measurements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parameter_id UUID NOT NULL REFERENCES public.spc_control_parameters(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  lot_id UUID REFERENCES public.production_lots(id) ON DELETE SET NULL,
  sample_number INTEGER NOT NULL,
  values NUMERIC[] NOT NULL,
  mean_value NUMERIC NOT NULL,
  range_value NUMERIC NOT NULL,
  std_deviation NUMERIC,
  is_in_control BOOLEAN NOT NULL DEFAULT true,
  out_of_control_type TEXT, -- 'above_ucl', 'below_lcl', 'trend', 'run', 'pattern'
  operator_id UUID,
  operator_name TEXT,
  notes TEXT,
  measured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Alertas SPC
CREATE TABLE public.spc_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parameter_id UUID NOT NULL REFERENCES public.spc_control_parameters(id) ON DELETE CASCADE,
  measurement_id UUID REFERENCES public.spc_measurements(id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL, -- 'out_of_spec', 'out_of_control', 'trend', 'run', 'capability_low'
  severity TEXT NOT NULL DEFAULT 'warning', -- 'info', 'warning', 'critical'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  value NUMERIC,
  is_acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolution TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Índices de capacidade do processo
CREATE TABLE public.spc_capability_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parameter_id UUID NOT NULL REFERENCES public.spc_control_parameters(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  sample_count INTEGER NOT NULL,
  mean NUMERIC NOT NULL,
  std_deviation NUMERIC NOT NULL,
  cp NUMERIC, -- Process Capability
  cpk NUMERIC, -- Process Capability Index
  pp NUMERIC, -- Process Performance
  ppk NUMERIC, -- Process Performance Index
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Enable RLS
ALTER TABLE public.spc_control_parameters ENABLE ROW LEVEL SECURITY

ALTER TABLE public.spc_measurements ENABLE ROW LEVEL SECURITY

ALTER TABLE public.spc_alerts ENABLE ROW LEVEL SECURITY

ALTER TABLE public.spc_capability_history ENABLE ROW LEVEL SECURITY

-- RLS Policies
CREATE POLICY "Anyone can view SPC parameters" ON public.spc_control_parameters FOR SELECT USING (true)

CREATE POLICY "Coordinators can manage SPC parameters" ON public.spc_control_parameters FOR ALL 
  USING (has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role))

CREATE POLICY "Anyone can view SPC measurements" ON public.spc_measurements FOR SELECT USING (true)

CREATE POLICY "Authenticated users can insert measurements" ON public.spc_measurements FOR INSERT WITH CHECK (auth.uid() IS NOT NULL)

CREATE POLICY "Anyone can view SPC alerts" ON public.spc_alerts FOR SELECT USING (true)

CREATE POLICY "Authenticated users can manage SPC alerts" ON public.spc_alerts FOR ALL 
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)

CREATE POLICY "Anyone can view capability history" ON public.spc_capability_history FOR SELECT USING (true)

CREATE POLICY "System can manage capability history" ON public.spc_capability_history FOR ALL USING (true) WITH CHECK (true)

-- Trigger for updated_at
CREATE TRIGGER update_spc_control_parameters_updated_at
  BEFORE UPDATE ON public.spc_control_parameters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()
