-- Add versioning and ranges to technical_sheets
ALTER TABLE public.technical_sheets 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS settings_ranges JSONB DEFAULT '{}'::jsonb

-- Add technical_sheet_version to tpm_executions to track which version was used
ALTER TABLE public.tpm_executions
ADD COLUMN IF NOT EXISTS technical_sheet_version INTEGER

-- Ensure RLS is enabled and policies are up to date (usually already enabled for these tables)
-- Adding a trigger to auto-increment version on update if any critical fields change
CREATE OR REPLACE FUNCTION public.increment_technical_sheet_version()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    OLD.title IS DISTINCT FROM NEW.title OR 
    OLD.machine_settings IS DISTINCT FROM NEW.machine_settings OR
    OLD.settings_ranges IS DISTINCT FROM NEW.settings_ranges OR
    OLD.ink_specifications IS DISTINCT FROM NEW.ink_specifications OR
    OLD.tooling_specifications IS DISTINCT FROM NEW.tooling_specifications
  ) THEN
    NEW.version = OLD.version + 1;
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql

CREATE TRIGGER tr_increment_tech_sheet_version
BEFORE UPDATE ON public.technical_sheets
FOR EACH ROW
EXECUTE FUNCTION public.increment_technical_sheet_version()
