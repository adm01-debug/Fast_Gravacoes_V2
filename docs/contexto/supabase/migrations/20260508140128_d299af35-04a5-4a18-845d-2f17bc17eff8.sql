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
$$ LANGUAGE plpgsql SET search_path = public
