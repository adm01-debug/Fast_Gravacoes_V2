-- Expand technical_sheets with quality checklist and setup instructions
ALTER TABLE public.technical_sheets 
ADD COLUMN IF NOT EXISTS quality_checklist JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS setup_instructions TEXT

-- Add quality_responses to maintenance_records
ALTER TABLE public.maintenance_records
ADD COLUMN IF NOT EXISTS quality_responses JSONB DEFAULT '[]'::jsonb
