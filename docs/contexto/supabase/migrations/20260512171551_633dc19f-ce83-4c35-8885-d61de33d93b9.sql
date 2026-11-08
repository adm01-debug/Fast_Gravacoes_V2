-- Add operator_id column to jobs table
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS operator_id UUID REFERENCES auth.users(id)

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_jobs_operator_id ON public.jobs(operator_id)

-- Update RLS if necessary (usually jobs policies already allow coordinators/operators)
-- Assuming jobs table already has RLS enabled.
