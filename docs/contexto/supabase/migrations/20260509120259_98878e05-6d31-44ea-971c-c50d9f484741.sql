-- Create custom type for sheet status if it doesn't exist
DO $$ BEGIN
    CREATE TYPE public.sheet_status AS ENUM ('draft', 'published', 'review_needed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$

-- Add status column to technical_sheets
ALTER TABLE public.technical_sheets 
ADD COLUMN IF NOT EXISTS status public.sheet_status DEFAULT 'draft'

-- Create audit log table for technical sheets
CREATE TABLE IF NOT EXISTS public.technical_sheet_audit_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    technical_sheet_id UUID REFERENCES public.technical_sheets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    changes JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
)

-- Enable RLS on logs
ALTER TABLE public.technical_sheet_audit_logs ENABLE ROW LEVEL SECURITY

-- Policies for audit logs
CREATE POLICY "Users can view audit logs of sheets they can access" 
ON public.technical_sheet_audit_logs 
FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.technical_sheets WHERE id = technical_sheet_id))

-- Update RLS on technical_sheets to handle status
-- (Assuming existing policies exist, we might need to update them or add more restrictive ones for operators)
-- Example: Operators can only see 'published' sheets
CREATE POLICY "Operators can only view published sheets"
ON public.technical_sheets
FOR SELECT
USING (
    (auth.jwt() ->> 'role' = 'operator' AND status = 'published') 
    OR 
    (auth.jwt() ->> 'role' IN ('admin', 'coordinator'))
)

-- Function to automatically log changes
CREATE OR REPLACE FUNCTION public.log_technical_sheet_change()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.technical_sheet_audit_logs (technical_sheet_id, user_id, action, changes)
    VALUES (
        COALESCE(NEW.id, OLD.id),
        auth.uid(),
        TG_OP,
        jsonb_build_object(
            'old', to_jsonb(OLD),
            'new', to_jsonb(NEW)
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER

-- Trigger for logging
DROP TRIGGER IF EXISTS tr_log_technical_sheet_changes ON public.technical_sheets

CREATE TRIGGER tr_log_technical_sheet_changes
AFTER INSERT OR UPDATE OR DELETE ON public.technical_sheets
FOR EACH ROW EXECUTE FUNCTION public.log_technical_sheet_change()
