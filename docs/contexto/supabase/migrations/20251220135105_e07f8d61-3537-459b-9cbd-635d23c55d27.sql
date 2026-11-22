-- Tabela principal de passagens de turno
CREATE TABLE public.shift_handovers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_date DATE NOT NULL DEFAULT CURRENT_DATE,
  shift_type TEXT NOT NULL CHECK (shift_type IN ('morning', 'afternoon', 'night')),
  outgoing_operator_id UUID NOT NULL,
  incoming_operator_id UUID,
  machine_id UUID REFERENCES public.machines(id),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending_acceptance', 'completed', 'cancelled')),
  general_notes TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Itens do checklist de passagem
CREATE TABLE public.shift_handover_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_id UUID NOT NULL REFERENCES public.shift_handovers(id) ON DELETE CASCADE,
  item_description TEXT NOT NULL,
  is_checked BOOLEAN NOT NULL DEFAULT false,
  checked_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  item_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Pendências entre turnos
CREATE TABLE public.shift_pending_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_id UUID NOT NULL REFERENCES public.shift_handovers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  machine_id UUID REFERENCES public.machines(id),
  job_id UUID REFERENCES public.jobs(id),
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Ocorrências durante o turno
CREATE TABLE public.shift_occurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_id UUID NOT NULL REFERENCES public.shift_handovers(id) ON DELETE CASCADE,
  occurrence_type TEXT NOT NULL CHECK (occurrence_type IN ('incident', 'maintenance', 'quality', 'safety', 'production', 'other')),
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  machine_id UUID REFERENCES public.machines(id),
  job_id UUID REFERENCES public.jobs(id),
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolution TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  photos TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Templates de checklist padrão
CREATE TABLE public.shift_checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  machine_id UUID REFERENCES public.machines(id),
  technique_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Enable RLS
ALTER TABLE public.shift_handovers ENABLE ROW LEVEL SECURITY

ALTER TABLE public.shift_handover_checklist ENABLE ROW LEVEL SECURITY

ALTER TABLE public.shift_pending_tasks ENABLE ROW LEVEL SECURITY

ALTER TABLE public.shift_occurrences ENABLE ROW LEVEL SECURITY

ALTER TABLE public.shift_checklist_templates ENABLE ROW LEVEL SECURITY

-- Policies for shift_handovers
CREATE POLICY "Anyone can view shift handovers" ON public.shift_handovers
  FOR SELECT USING (true)

CREATE POLICY "Authenticated users can create handovers" ON public.shift_handovers
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL)

CREATE POLICY "Operators can update their handovers" ON public.shift_handovers
  FOR UPDATE USING (
    outgoing_operator_id = auth.uid() OR 
    incoming_operator_id = auth.uid() OR
    has_role(auth.uid(), 'coordinator'::app_role)
  )

-- Policies for shift_handover_checklist
CREATE POLICY "Anyone can view checklist items" ON public.shift_handover_checklist
  FOR SELECT USING (true)

CREATE POLICY "Authenticated users can manage checklist" ON public.shift_handover_checklist
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)

-- Policies for shift_pending_tasks
CREATE POLICY "Anyone can view pending tasks" ON public.shift_pending_tasks
  FOR SELECT USING (true)

CREATE POLICY "Authenticated users can manage pending tasks" ON public.shift_pending_tasks
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)

-- Policies for shift_occurrences
CREATE POLICY "Anyone can view occurrences" ON public.shift_occurrences
  FOR SELECT USING (true)

CREATE POLICY "Authenticated users can manage occurrences" ON public.shift_occurrences
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)

-- Policies for shift_checklist_templates
CREATE POLICY "Anyone can view templates" ON public.shift_checklist_templates
  FOR SELECT USING (true)

CREATE POLICY "Coordinators can manage templates" ON public.shift_checklist_templates
  FOR ALL USING (has_role(auth.uid(), 'coordinator'::app_role))
  WITH CHECK (has_role(auth.uid(), 'coordinator'::app_role))

-- Trigger for updated_at
CREATE TRIGGER update_shift_handovers_updated_at
  BEFORE UPDATE ON public.shift_handovers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()

CREATE TRIGGER update_shift_pending_tasks_updated_at
  BEFORE UPDATE ON public.shift_pending_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()

CREATE TRIGGER update_shift_checklist_templates_updated_at
  BEFORE UPDATE ON public.shift_checklist_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.shift_handovers

ALTER PUBLICATION supabase_realtime ADD TABLE public.shift_pending_tasks
