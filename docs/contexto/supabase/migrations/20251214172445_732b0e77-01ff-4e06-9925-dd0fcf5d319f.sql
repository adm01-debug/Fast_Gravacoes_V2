-- Create ABC Activities table (cost drivers)
CREATE TABLE public.abc_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  cost_driver TEXT NOT NULL, -- 'machine_hours', 'setup_count', 'quantity', 'labor_hours'
  technique_id TEXT REFERENCES public.techniques(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Create ABC Cost Pools table
CREATE TABLE public.abc_cost_pools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  pool_type TEXT NOT NULL, -- 'direct_labor', 'machine', 'overhead', 'material', 'setup'
  monthly_budget NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Create ABC Activity Rates (links cost pools to activities)
CREATE TABLE public.abc_activity_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES public.abc_activities(id) ON DELETE CASCADE,
  cost_pool_id UUID NOT NULL REFERENCES public.abc_cost_pools(id) ON DELETE CASCADE,
  rate_per_unit NUMERIC(10,4) NOT NULL DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(activity_id, cost_pool_id, period_start)
)

-- Create ABC Job Costs (calculated costs per job)
CREATE TABLE public.abc_job_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES public.abc_activities(id),
  cost_pool_id UUID NOT NULL REFERENCES public.abc_cost_pools(id),
  driver_quantity NUMERIC(10,2) NOT NULL DEFAULT 0,
  unit_rate NUMERIC(10,4) NOT NULL DEFAULT 0,
  total_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Enable RLS
ALTER TABLE public.abc_activities ENABLE ROW LEVEL SECURITY

ALTER TABLE public.abc_cost_pools ENABLE ROW LEVEL SECURITY

ALTER TABLE public.abc_activity_rates ENABLE ROW LEVEL SECURITY

ALTER TABLE public.abc_job_costs ENABLE ROW LEVEL SECURITY

-- RLS Policies for abc_activities
CREATE POLICY "Anyone can view activities" ON public.abc_activities FOR SELECT USING (true)

CREATE POLICY "Coordinators can manage activities" ON public.abc_activities FOR ALL 
  USING (has_role(auth.uid(), 'coordinator')) 
  WITH CHECK (has_role(auth.uid(), 'coordinator'))

-- RLS Policies for abc_cost_pools
CREATE POLICY "Anyone can view cost pools" ON public.abc_cost_pools FOR SELECT USING (true)

CREATE POLICY "Coordinators can manage cost pools" ON public.abc_cost_pools FOR ALL 
  USING (has_role(auth.uid(), 'coordinator')) 
  WITH CHECK (has_role(auth.uid(), 'coordinator'))

-- RLS Policies for abc_activity_rates
CREATE POLICY "Anyone can view activity rates" ON public.abc_activity_rates FOR SELECT USING (true)

CREATE POLICY "Coordinators can manage activity rates" ON public.abc_activity_rates FOR ALL 
  USING (has_role(auth.uid(), 'coordinator')) 
  WITH CHECK (has_role(auth.uid(), 'coordinator'))

-- RLS Policies for abc_job_costs
CREATE POLICY "Anyone can view job costs" ON public.abc_job_costs FOR SELECT USING (true)

CREATE POLICY "Coordinators can manage job costs" ON public.abc_job_costs FOR ALL 
  USING (has_role(auth.uid(), 'coordinator')) 
  WITH CHECK (has_role(auth.uid(), 'coordinator'))

-- Triggers for updated_at
CREATE TRIGGER update_abc_activities_updated_at BEFORE UPDATE ON public.abc_activities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()

CREATE TRIGGER update_abc_cost_pools_updated_at BEFORE UPDATE ON public.abc_cost_pools
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()

CREATE TRIGGER update_abc_activity_rates_updated_at BEFORE UPDATE ON public.abc_activity_rates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()

-- Insert default activities
INSERT INTO public.abc_activities (name, description, cost_driver) VALUES
  ('Setup de Máquina', 'Preparação e configuração inicial da máquina', 'setup_count'),
  ('Produção', 'Tempo de produção efetiva', 'machine_hours'),
  ('Controle de Qualidade', 'Inspeção e verificação de qualidade', 'quantity'),
  ('Mão de Obra Direta', 'Trabalho do operador', 'labor_hours'),
  ('Manuseio de Material', 'Movimentação e preparação de materiais', 'quantity')

-- Insert default cost pools
INSERT INTO public.abc_cost_pools (name, description, pool_type, monthly_budget) VALUES
  ('Mão de Obra Direta', 'Salários e encargos dos operadores', 'direct_labor', 50000),
  ('Custos de Máquina', 'Depreciação, energia e manutenção', 'machine', 30000),
  ('Overhead Fabril', 'Custos indiretos de fabricação', 'overhead', 20000),
  ('Materiais Indiretos', 'Materiais de consumo e insumos', 'material', 10000),
  ('Setup e Preparação', 'Custos de preparação e troca', 'setup', 5000)
