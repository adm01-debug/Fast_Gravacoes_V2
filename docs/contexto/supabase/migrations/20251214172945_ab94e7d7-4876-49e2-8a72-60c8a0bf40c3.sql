-- Create maintenance types enum-like table
CREATE TABLE public.maintenance_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  default_interval_days INTEGER NOT NULL DEFAULT 30,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Create maintenance schedules (recurring maintenance per machine)
CREATE TABLE public.maintenance_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  maintenance_type_id TEXT NOT NULL REFERENCES public.maintenance_types(id),
  name TEXT NOT NULL,
  description TEXT,
  interval_days INTEGER NOT NULL DEFAULT 30,
  last_completed_at TIMESTAMP WITH TIME ZONE,
  next_due_at TIMESTAMP WITH TIME ZONE NOT NULL,
  estimated_duration_minutes INTEGER NOT NULL DEFAULT 60,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Create maintenance checklists (templates)
CREATE TABLE public.maintenance_checklists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  maintenance_type_id TEXT NOT NULL REFERENCES public.maintenance_types(id),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Create checklist items
CREATE TABLE public.maintenance_checklist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_id UUID NOT NULL REFERENCES public.maintenance_checklists(id) ON DELETE CASCADE,
  item_order INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  is_critical BOOLEAN NOT NULL DEFAULT false,
  requires_photo BOOLEAN NOT NULL DEFAULT false,
  requires_measurement BOOLEAN NOT NULL DEFAULT false,
  measurement_unit TEXT,
  min_value NUMERIC,
  max_value NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Create maintenance records (completed maintenance)
CREATE TABLE public.maintenance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID NOT NULL REFERENCES public.maintenance_schedules(id) ON DELETE CASCADE,
  machine_id UUID NOT NULL REFERENCES public.machines(id),
  maintenance_type_id TEXT NOT NULL REFERENCES public.maintenance_types(id),
  performed_by UUID,
  performed_by_name TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'completed', 'cancelled', 'pending_parts'
  notes TEXT,
  photos TEXT[] DEFAULT '{}',
  total_cost NUMERIC(10,2) DEFAULT 0,
  downtime_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Create checklist item responses
CREATE TABLE public.maintenance_item_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  record_id UUID NOT NULL REFERENCES public.maintenance_records(id) ON DELETE CASCADE,
  checklist_item_id UUID NOT NULL REFERENCES public.maintenance_checklist_items(id),
  is_checked BOOLEAN NOT NULL DEFAULT false,
  measurement_value NUMERIC,
  notes TEXT,
  photo_url TEXT,
  responded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Create maintenance alerts
CREATE TABLE public.maintenance_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID NOT NULL REFERENCES public.maintenance_schedules(id) ON DELETE CASCADE,
  machine_id UUID NOT NULL REFERENCES public.machines(id),
  alert_type TEXT NOT NULL, -- 'upcoming', 'due', 'overdue', 'critical'
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Enable RLS on all tables
ALTER TABLE public.maintenance_types ENABLE ROW LEVEL SECURITY

ALTER TABLE public.maintenance_schedules ENABLE ROW LEVEL SECURITY

ALTER TABLE public.maintenance_checklists ENABLE ROW LEVEL SECURITY

ALTER TABLE public.maintenance_checklist_items ENABLE ROW LEVEL SECURITY

ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY

ALTER TABLE public.maintenance_item_responses ENABLE ROW LEVEL SECURITY

ALTER TABLE public.maintenance_alerts ENABLE ROW LEVEL SECURITY

-- RLS Policies for maintenance_types
CREATE POLICY "Anyone can view maintenance types" ON public.maintenance_types FOR SELECT USING (true)

CREATE POLICY "Coordinators can manage maintenance types" ON public.maintenance_types FOR ALL 
  USING (has_role(auth.uid(), 'coordinator')) 
  WITH CHECK (has_role(auth.uid(), 'coordinator'))

-- RLS Policies for maintenance_schedules
CREATE POLICY "Anyone can view maintenance schedules" ON public.maintenance_schedules FOR SELECT USING (true)

CREATE POLICY "Coordinators can manage maintenance schedules" ON public.maintenance_schedules FOR ALL 
  USING (has_role(auth.uid(), 'coordinator')) 
  WITH CHECK (has_role(auth.uid(), 'coordinator'))

-- RLS Policies for maintenance_checklists
CREATE POLICY "Anyone can view maintenance checklists" ON public.maintenance_checklists FOR SELECT USING (true)

CREATE POLICY "Coordinators can manage maintenance checklists" ON public.maintenance_checklists FOR ALL 
  USING (has_role(auth.uid(), 'coordinator')) 
  WITH CHECK (has_role(auth.uid(), 'coordinator'))

-- RLS Policies for maintenance_checklist_items
CREATE POLICY "Anyone can view checklist items" ON public.maintenance_checklist_items FOR SELECT USING (true)

CREATE POLICY "Coordinators can manage checklist items" ON public.maintenance_checklist_items FOR ALL 
  USING (has_role(auth.uid(), 'coordinator')) 
  WITH CHECK (has_role(auth.uid(), 'coordinator'))

-- RLS Policies for maintenance_records
CREATE POLICY "Anyone can view maintenance records" ON public.maintenance_records FOR SELECT USING (true)

CREATE POLICY "Authenticated users can insert maintenance records" ON public.maintenance_records FOR INSERT WITH CHECK (true)

CREATE POLICY "Authenticated users can update maintenance records" ON public.maintenance_records FOR UPDATE USING (true)

-- RLS Policies for maintenance_item_responses
CREATE POLICY "Anyone can view item responses" ON public.maintenance_item_responses FOR SELECT USING (true)

CREATE POLICY "Authenticated users can manage item responses" ON public.maintenance_item_responses FOR ALL USING (true) WITH CHECK (true)

-- RLS Policies for maintenance_alerts
CREATE POLICY "Anyone can view maintenance alerts" ON public.maintenance_alerts FOR SELECT USING (true)

CREATE POLICY "Authenticated users can update maintenance alerts" ON public.maintenance_alerts FOR UPDATE USING (true)

CREATE POLICY "System can insert maintenance alerts" ON public.maintenance_alerts FOR INSERT WITH CHECK (true)

-- Triggers for updated_at
CREATE TRIGGER update_maintenance_schedules_updated_at BEFORE UPDATE ON public.maintenance_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()

CREATE TRIGGER update_maintenance_checklists_updated_at BEFORE UPDATE ON public.maintenance_checklists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()

-- Insert default maintenance types
INSERT INTO public.maintenance_types (id, name, description, default_interval_days, color) VALUES
  ('preventive', 'Manutenção Preventiva', 'Manutenção programada para prevenir falhas', 30, '#22c55e'),
  ('corrective', 'Manutenção Corretiva', 'Reparo após identificação de problema', 0, '#ef4444'),
  ('predictive', 'Manutenção Preditiva', 'Baseada em análise de dados e sensores', 90, '#3b82f6'),
  ('cleaning', 'Limpeza', 'Limpeza e higienização de equipamentos', 7, '#06b6d4'),
  ('lubrication', 'Lubrificação', 'Lubrificação de componentes móveis', 14, '#f59e0b'),
  ('calibration', 'Calibração', 'Calibração e ajuste de precisão', 60, '#8b5cf6'),
  ('inspection', 'Inspeção', 'Inspeção visual e funcional', 7, '#64748b')
