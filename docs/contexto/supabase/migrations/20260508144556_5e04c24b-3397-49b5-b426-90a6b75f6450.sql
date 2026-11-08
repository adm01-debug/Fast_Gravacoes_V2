-- Table for supplies used during execution
CREATE TABLE IF NOT EXISTS public.tpm_execution_supplies (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    execution_id UUID NOT NULL REFERENCES public.tpm_executions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    quantity TEXT NOT NULL,
    alternative_used BOOLEAN DEFAULT false,
    original_recommended_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
)

-- Table for alerts and failure scenarios captured during execution
CREATE TABLE IF NOT EXISTS public.tpm_execution_alerts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    execution_id UUID NOT NULL REFERENCES public.tpm_executions(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL, -- 'out_of_range' | 'failure_scenario'
    parameter_name TEXT,
    expected_range TEXT,
    actual_value TEXT,
    severity TEXT DEFAULT 'warning', -- 'info' | 'warning' | 'critical'
    description TEXT,
    evidence_urls TEXT[] DEFAULT '{}',
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
)

-- Add quality checklist results to tpm_executions for better history
ALTER TABLE public.tpm_executions 
ADD COLUMN IF NOT EXISTS quality_checklist_results JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS failure_risk_detected BOOLEAN DEFAULT false

-- Enable RLS
ALTER TABLE public.tpm_execution_supplies ENABLE ROW LEVEL SECURITY

ALTER TABLE public.tpm_execution_alerts ENABLE ROW LEVEL SECURITY

-- Create Policies
CREATE POLICY "Users can view tpm execution supplies" 
ON public.tpm_execution_supplies FOR SELECT USING (true)

CREATE POLICY "Users can manage tpm execution supplies" 
ON public.tpm_execution_supplies FOR ALL USING (auth.uid() IS NOT NULL)

CREATE POLICY "Users can view tpm execution alerts" 
ON public.tpm_execution_alerts FOR SELECT USING (true)

CREATE POLICY "Users can manage tpm execution alerts" 
ON public.tpm_execution_alerts FOR ALL USING (auth.uid() IS NOT NULL)

-- Create bucket for execution evidences if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('execution-evidence', 'execution-evidence', true)
ON CONFLICT (id) DO NOTHING

-- Storage policies for evidence
CREATE POLICY "Anyone can view execution evidence"
ON storage.objects FOR SELECT
USING (bucket_id = 'execution-evidence')

CREATE POLICY "Authenticated users can upload execution evidence"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'execution-evidence' AND auth.role() = 'authenticated')
