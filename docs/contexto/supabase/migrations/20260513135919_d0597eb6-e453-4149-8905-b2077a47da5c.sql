-- Table to store RLS test results
CREATE TABLE IF NOT EXISTS public.rls_test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_name TEXT NOT NULL,
    table_name TEXT NOT NULL,
    role TEXT NOT NULL,
    operation TEXT NOT NULL,
    passed BOOLEAN NOT NULL,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
)

-- Enable RLS but allow anyone to view results for now (internal audit tool)
ALTER TABLE public.rls_test_results ENABLE ROW LEVEL SECURITY

CREATE POLICY "Allow authenticated to view test results"
ON public.rls_test_results FOR SELECT
TO authenticated
USING (true)

CREATE POLICY "Allow service role to manage test results"
ON public.rls_test_results FOR ALL
TO service_role
USING (true)
WITH CHECK (true)
