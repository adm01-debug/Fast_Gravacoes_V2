-- =============================================
-- 1. RASTREABILIDADE/GENEALOGIA DE PRODUTOS
-- =============================================

-- Tabela de lotes de produção
CREATE TABLE public.production_lots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lot_number TEXT NOT NULL UNIQUE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  produced_quantity INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  production_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiration_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Tabela de componentes/materiais usados em cada lote
CREATE TABLE public.lot_components (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lot_id UUID NOT NULL REFERENCES public.production_lots(id) ON DELETE CASCADE,
  component_lot_id UUID REFERENCES public.production_lots(id) ON DELETE SET NULL,
  material_id UUID REFERENCES public.materials(id) ON DELETE SET NULL,
  component_name TEXT NOT NULL,
  quantity_used NUMERIC NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'un',
  supplier TEXT,
  batch_number TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Tabela de movimentações de lotes (rastreabilidade)
CREATE TABLE public.lot_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lot_id UUID NOT NULL REFERENCES public.production_lots(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL, -- 'production', 'transfer', 'consumption', 'adjustment', 'return'
  quantity INTEGER NOT NULL,
  from_location TEXT,
  to_location TEXT,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  performed_by UUID,
  performed_by_name TEXT,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Tabela de inspeções de qualidade por lote
CREATE TABLE public.lot_quality_inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lot_id UUID NOT NULL REFERENCES public.production_lots(id) ON DELETE CASCADE,
  inspection_type TEXT NOT NULL,
  result TEXT NOT NULL, -- 'approved', 'rejected', 'conditional'
  inspector_id UUID,
  inspector_name TEXT,
  sample_size INTEGER,
  defects_found INTEGER DEFAULT 0,
  notes TEXT,
  photos TEXT[] DEFAULT '{}',
  inspected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Enable RLS
ALTER TABLE public.production_lots ENABLE ROW LEVEL SECURITY

ALTER TABLE public.lot_components ENABLE ROW LEVEL SECURITY

ALTER TABLE public.lot_movements ENABLE ROW LEVEL SECURITY

ALTER TABLE public.lot_quality_inspections ENABLE ROW LEVEL SECURITY

-- RLS Policies for production_lots
CREATE POLICY "Anyone can view production lots" ON public.production_lots FOR SELECT USING (true)

CREATE POLICY "Coordinators can manage production lots" ON public.production_lots FOR ALL 
  USING (has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role))

-- RLS Policies for lot_components
CREATE POLICY "Anyone can view lot components" ON public.lot_components FOR SELECT USING (true)

CREATE POLICY "Coordinators can manage lot components" ON public.lot_components FOR ALL 
  USING (has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role))

-- RLS Policies for lot_movements
CREATE POLICY "Anyone can view lot movements" ON public.lot_movements FOR SELECT USING (true)

CREATE POLICY "Authenticated users can insert movements" ON public.lot_movements FOR INSERT WITH CHECK (auth.uid() IS NOT NULL)

-- RLS Policies for lot_quality_inspections
CREATE POLICY "Anyone can view quality inspections" ON public.lot_quality_inspections FOR SELECT USING (true)

CREATE POLICY "Authenticated users can manage inspections" ON public.lot_quality_inspections FOR ALL 
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)

-- Triggers for updated_at
CREATE TRIGGER update_production_lots_updated_at
  BEFORE UPDATE ON public.production_lots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()
