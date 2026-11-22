-- Add evidence and justification fields to parameter alerts
ALTER TABLE public.tpm_parameter_alerts 
ADD COLUMN IF NOT EXISTS evidence_url TEXT,
ADD COLUMN IF NOT EXISTS evidence_notes TEXT,
ADD COLUMN IF NOT EXISTS evidence_files TEXT[],
ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS is_critical BOOLEAN DEFAULT false

-- Add override and justification fields to maintenance records
ALTER TABLE public.maintenance_records 
ADD COLUMN IF NOT EXISTS justification TEXT,
ADD COLUMN IF NOT EXISTS override_justification TEXT,
ADD COLUMN IF NOT EXISTS override_by UUID REFERENCES auth.users(id)

-- Create tpm_execution_supplies table for detailed tracking
CREATE TABLE IF NOT EXISTS public.tpm_execution_supplies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL REFERENCES public.maintenance_records(id) ON DELETE CASCADE,
    material_id UUID REFERENCES public.materials(id),
    name TEXT NOT NULL,
    suggested_quantity DECIMAL,
    actual_quantity DECIMAL NOT NULL,
    is_alternative BOOLEAN DEFAULT false,
    original_material_id UUID REFERENCES public.materials(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
)

-- Enable RLS
ALTER TABLE public.tpm_execution_supplies ENABLE ROW LEVEL SECURITY

-- Policies for tpm_execution_supplies
CREATE POLICY "Users can view execution supplies" 
ON public.tpm_execution_supplies FOR SELECT 
USING (true)

CREATE POLICY "Users can insert execution supplies" 
ON public.tpm_execution_supplies FOR INSERT 
WITH CHECK (true)

-- Ensure tpm_execution_alerts has is_critical
ALTER TABLE public.tpm_execution_alerts
ADD COLUMN IF NOT EXISTS is_critical BOOLEAN DEFAULT false
