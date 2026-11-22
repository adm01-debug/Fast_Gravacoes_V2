-- Create table for Bitrix24 field mappings
CREATE TABLE public.bitrix24_field_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mapping_type TEXT NOT NULL, -- 'field', 'technique', 'priority', 'stage'
  source_key TEXT NOT NULL, -- Bitrix24 value or field name
  target_key TEXT NOT NULL, -- Our system value
  priority INTEGER NOT NULL DEFAULT 0, -- For field mappings, determines order
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(mapping_type, source_key, target_key)
)

-- Enable RLS
ALTER TABLE public.bitrix24_field_mappings ENABLE ROW LEVEL SECURITY

-- Anyone can view mappings
CREATE POLICY "Anyone can view mappings" 
ON public.bitrix24_field_mappings 
FOR SELECT 
USING (true)

-- Authenticated users can manage mappings
CREATE POLICY "Authenticated users can manage mappings" 
ON public.bitrix24_field_mappings 
FOR ALL 
USING (true)
WITH CHECK (true)

-- Add trigger for updated_at
CREATE TRIGGER update_bitrix24_field_mappings_updated_at
BEFORE UPDATE ON public.bitrix24_field_mappings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column()

-- Insert default field mappings
INSERT INTO public.bitrix24_field_mappings (mapping_type, source_key, target_key, priority) VALUES
-- Field mappings (source = job field, target = bitrix field)
('field', 'client', 'UF_CRM_CLIENT', 1),
('field', 'client', 'UF_CRM_CLIENTE', 2),
('field', 'client', 'COMPANY_ID', 3),
('field', 'product', 'UF_CRM_PRODUCT', 1),
('field', 'product', 'UF_CRM_PRODUTO', 2),
('field', 'product', 'TITLE', 3),
('field', 'quantity', 'UF_CRM_QUANTITY', 1),
('field', 'quantity', 'UF_CRM_QUANTIDADE', 2),
('field', 'quantity', 'UF_CRM_QTD', 3),
('field', 'technique_id', 'UF_CRM_TECHNIQUE', 1),
('field', 'technique_id', 'UF_CRM_TECNICA', 2),
('field', 'technique_id', 'UF_CRM_TIPO_GRAVACAO', 3),
('field', 'priority', 'UF_CRM_PRIORITY', 1),
('field', 'priority', 'UF_CRM_PRIORIDADE', 2),
('field', 'priority', 'UF_CRM_URGENCIA', 3),
('field', 'scheduled_date', 'UF_CRM_SCHEDULED_DATE', 1),
('field', 'scheduled_date', 'UF_CRM_DATA_AGENDADA', 2),
('field', 'scheduled_date', 'UF_CRM_DATA_ENTREGA', 3),
('field', 'gravure_color', 'UF_CRM_GRAVURE_COLOR', 1),
('field', 'gravure_color', 'UF_CRM_COR_GRAVURA', 2),
('field', 'gravure_color', 'UF_CRM_COR', 3),
('field', 'notes', 'UF_CRM_NOTES', 1),
('field', 'notes', 'UF_CRM_OBSERVACOES', 2),
('field', 'notes', 'COMMENTS', 3),
('field', 'estimated_duration', 'UF_CRM_DURATION', 1),
('field', 'estimated_duration', 'UF_CRM_TEMPO_ESTIMADO', 2),

-- Technique mappings (source = bitrix value, target = system id)
('technique', 'silk_textil', 'silk-textile', 0),
('technique', 'silk textil', 'silk-textile', 0),
('technique', 'silk têxtil', 'silk-textile', 0),
('technique', 'fiber_laser', 'fiber-laser', 0),
('technique', 'fiber laser', 'fiber-laser', 0),
('technique', 'laser_co2', 'laser-co2', 0),
('technique', 'laser co2', 'laser-co2', 0),
('technique', 'laser_uv', 'laser-uv', 0),
('technique', 'tampografia', 'tampo', 0),
('technique', 'tampo', 'tampo', 0),
('technique', 'hot_stamping', 'hot-stamp', 0),
('technique', 'hot stamping', 'hot-stamp', 0),
('technique', 'sublimacao', 'sublimation-mug', 0),
('technique', 'sublimação', 'sublimation-mug', 0),

-- Priority mappings
('priority', 'urgente', 'urgent', 0),
('priority', 'urgent', 'urgent', 0),
('priority', 'alta', 'high', 0),
('priority', 'high', 'high', 0),
('priority', 'media', 'medium', 0),
('priority', 'medium', 'medium', 0),
('priority', 'normal', 'medium', 0),
('priority', 'baixa', 'low', 0),
('priority', 'low', 'low', 0),

-- Stage mappings (source = bitrix stage, target = system status)
('stage', 'NEW', 'queue', 0),
('stage', 'PREPARATION', 'queue', 0),
('stage', 'PREPAID_INVOICE', 'ready', 0),
('stage', 'EXECUTING', 'production', 0),
('stage', 'FINAL_INVOICE', 'production', 0),
('stage', 'WON', 'finished', 0),
('stage', 'LOSE', 'cancelled', 0),
('stage', 'APOLOGY', 'cancelled', 0)
