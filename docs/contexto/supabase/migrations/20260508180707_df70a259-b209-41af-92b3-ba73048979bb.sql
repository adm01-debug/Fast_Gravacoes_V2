-- Create error logs table
CREATE TABLE IF NOT EXISTS public.error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message TEXT NOT NULL,
    stack TEXT,
    component_name TEXT,
    url TEXT,
    user_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
)

-- Enable RLS
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY

-- Allow anonymous inserts (so we can log errors even if the user isn't logged in yet)
CREATE POLICY "Anyone can insert error logs"
ON public.error_logs
FOR INSERT
WITH CHECK (true)

-- Allow authenticated users to view their own logs (optional, but good for debugging)
CREATE POLICY "Users can view their own error logs"
ON public.error_logs
FOR SELECT
USING (auth.uid() = user_id)

-- If you have an admin role, you could add a policy for that too
-- CREATE POLICY "Admins can view all error logs" ON public.error_logs FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');
