-- Add image fields to technical_sheets
ALTER TABLE public.technical_sheets 
ADD COLUMN IF NOT EXISTS gold_standard_image_url TEXT,
ADD COLUMN IF NOT EXISTS failure_standard_image_url TEXT

-- Create audit table for technical sheets
CREATE TABLE IF NOT EXISTS public.technical_sheet_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    technical_sheet_id UUID REFERENCES public.technical_sheets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'VERSION_BUMP'
    previous_data JSONB,
    new_data JSONB,
    change_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
)

-- Enable RLS for audit table
ALTER TABLE public.technical_sheet_audit ENABLE ROW LEVEL SECURITY

CREATE POLICY "Technical sheet audit visible to authenticated users" 
ON public.technical_sheet_audit FOR SELECT 
USING (auth.uid() IS NOT NULL)

-- Create favorites table
CREATE TABLE IF NOT EXISTS public.technical_sheet_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    technical_sheet_id UUID REFERENCES public.technical_sheets(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, technical_sheet_id)
)

-- Enable RLS for favorites
ALTER TABLE public.technical_sheet_favorites ENABLE ROW LEVEL SECURITY

CREATE POLICY "Users can manage their own favorites" 
ON public.technical_sheet_favorites 
USING (auth.uid() = user_id)

-- Trigger function for auditing
CREATE OR REPLACE FUNCTION public.audit_technical_sheet_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_action TEXT;
BEGIN
    v_user_id := auth.uid();
    
    IF (TG_OP = 'INSERT') THEN
        v_action := 'CREATE';
        INSERT INTO public.technical_sheet_audit (technical_sheet_id, user_id, action, new_data)
        VALUES (NEW.id, v_user_id, v_action, to_jsonb(NEW));
    ELSIF (TG_OP = 'UPDATE') THEN
        v_action := 'UPDATE';
        INSERT INTO public.technical_sheet_audit (technical_sheet_id, user_id, action, previous_data, new_data)
        VALUES (NEW.id, v_user_id, v_action, to_jsonb(OLD), to_jsonb(NEW));
    ELSIF (TG_OP = 'DELETE') THEN
        v_action := 'DELETE';
        INSERT INTO public.technical_sheet_audit (technical_sheet_id, user_id, action, previous_data)
        VALUES (OLD.id, v_user_id, v_action, to_jsonb(OLD));
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER

-- Create trigger
DROP TRIGGER IF EXISTS tr_audit_technical_sheets ON public.technical_sheets

CREATE TRIGGER tr_audit_technical_sheets
AFTER INSERT OR UPDATE OR DELETE ON public.technical_sheets
FOR EACH ROW EXECUTE FUNCTION public.audit_technical_sheet_changes()
