ALTER TABLE public.technical_sheets 
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0

-- Function to increment view count
CREATE OR REPLACE FUNCTION public.increment_sheet_view_count(sheet_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.technical_sheets 
    SET view_count = view_count + 1 
    WHERE id = sheet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
