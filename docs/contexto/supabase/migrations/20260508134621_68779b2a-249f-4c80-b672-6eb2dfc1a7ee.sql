-- Add technical sheet link and parameters to maintenance_records
ALTER TABLE public.maintenance_records 
ADD COLUMN IF NOT EXISTS technical_sheet_id UUID REFERENCES public.technical_sheets(id),
ADD COLUMN IF NOT EXISTS adjustment_parameters JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS checklist_version INTEGER
