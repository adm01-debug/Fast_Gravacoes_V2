-- Add technical sheet link and parameters to tpm_executions
ALTER TABLE public.tpm_executions 
ADD COLUMN IF NOT EXISTS technical_sheet_id UUID REFERENCES public.technical_sheets(id),
ADD COLUMN IF NOT EXISTS adjustment_parameters JSONB DEFAULT '{}'::jsonb

-- Create a table for parameter alerts if it doesn't exist
CREATE TABLE IF NOT EXISTS public.tpm_parameter_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID REFERENCES public.tpm_executions(id) ON DELETE CASCADE,
    parameter_name TEXT NOT NULL,
    recorded_value TEXT,
    recommended_range TEXT,
    severity TEXT DEFAULT 'warning',
    is_resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
)

-- Enable RLS
ALTER TABLE public.tpm_parameter_alerts ENABLE ROW LEVEL SECURITY

-- Policies for tpm_parameter_alerts
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Everyone can view parameter alerts' AND tablename = 'tpm_parameter_alerts') THEN
        CREATE POLICY "Everyone can view parameter alerts" 
        ON public.tpm_parameter_alerts FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Coordinators and admins can manage alerts' AND tablename = 'tpm_parameter_alerts') THEN
        CREATE POLICY "Coordinators and admins can manage alerts" 
        ON public.tpm_parameter_alerts FOR ALL 
        USING (EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role IN ('coordinator', 'manager')
        ));
    END IF;
END $$
