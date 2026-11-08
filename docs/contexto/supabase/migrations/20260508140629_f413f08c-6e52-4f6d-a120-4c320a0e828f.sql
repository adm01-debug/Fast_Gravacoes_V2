-- Expand technical_sheets with more production-specific fields
ALTER TABLE public.technical_sheets 
ADD COLUMN IF NOT EXISTS gap_specifications TEXT,
ADD COLUMN IF NOT EXISTS challenges_notes TEXT,
ADD COLUMN IF NOT EXISTS failure_scenarios TEXT,
ADD COLUMN IF NOT EXISTS quality_requirements TEXT

-- Update the version increment trigger to include these new critical fields
CREATE OR REPLACE FUNCTION public.increment_technical_sheet_version()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    OLD.title IS DISTINCT FROM NEW.title OR 
    OLD.machine_settings IS DISTINCT FROM NEW.machine_settings OR
    OLD.settings_ranges IS DISTINCT FROM NEW.settings_ranges OR
    OLD.ink_specifications IS DISTINCT FROM NEW.ink_specifications OR
    OLD.tooling_specifications IS DISTINCT FROM NEW.tooling_specifications OR
    OLD.gap_specifications IS DISTINCT FROM NEW.gap_specifications OR
    OLD.challenges_notes IS DISTINCT FROM NEW.challenges_notes OR
    OLD.failure_scenarios IS DISTINCT FROM NEW.failure_scenarios OR
    OLD.quality_requirements IS DISTINCT FROM NEW.quality_requirements
  ) THEN
    NEW.version = OLD.version + 1;
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public
