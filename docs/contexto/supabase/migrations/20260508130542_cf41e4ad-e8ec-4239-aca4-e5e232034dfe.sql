-- Adicionar campos de correção em maintenance_records
ALTER TABLE public.maintenance_records 
ADD COLUMN IF NOT EXISTS correction_notes TEXT,
ADD COLUMN IF NOT EXISTS correction_deadline TIMESTAMP WITH TIME ZONE

COMMENT ON COLUMN public.maintenance_records.status IS 'Status: in_progress, completed, approved, cancelled, correction_requested'
