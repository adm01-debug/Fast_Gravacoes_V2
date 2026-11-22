-- Create technical_sheet_versions table
CREATE TABLE public.technical_sheet_versions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    sheet_id UUID NOT NULL REFERENCES public.technical_sheets(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    data JSONB NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Enable RLS
ALTER TABLE public.technical_sheet_versions ENABLE ROW LEVEL SECURITY

-- Create policies
CREATE POLICY "Versions are viewable by all authenticated users" 
ON public.technical_sheet_versions 
FOR SELECT 
USING (auth.uid() IS NOT NULL)

CREATE POLICY "Versions can be inserted by coordinators" 
ON public.technical_sheet_versions 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'coordinator'))

-- Function to create a version
CREATE OR REPLACE FUNCTION public.create_technical_sheet_version()
RETURNS TRIGGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT count(*) INTO v_count FROM public.technical_sheet_versions WHERE sheet_id = NEW.id;
    
    INSERT INTO public.technical_sheet_versions (sheet_id, version_number, data, created_by)
    VALUES (NEW.id, v_count + 1, row_to_json(NEW)::jsonb, auth.uid());
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER

-- Trigger to create version on update/insert
CREATE TRIGGER on_technical_sheet_save
AFTER INSERT OR UPDATE ON public.technical_sheets
FOR EACH ROW EXECUTE FUNCTION public.create_technical_sheet_version()
