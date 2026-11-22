ALTER TABLE public.maintenance_records 
ADD COLUMN IF NOT EXISTS technical_sheet_version INTEGER
