-- Create table to track failed login attempts and lockouts
CREATE TABLE public.login_lockouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL, -- email or IP
  identifier_type TEXT NOT NULL CHECK (identifier_type IN ('email', 'ip')),
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  last_failed_at TIMESTAMP WITH TIME ZONE,
  locked_until TIMESTAMP WITH TIME ZONE,
  lockout_count INTEGER NOT NULL DEFAULT 0, -- for exponential backoff
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(identifier, identifier_type)
)

-- Enable RLS
ALTER TABLE public.login_lockouts ENABLE ROW LEVEL SECURITY

-- Only allow service role to access this table (edge functions)
CREATE POLICY "Service role only" ON public.login_lockouts
  FOR ALL USING (false)

-- Create index for fast lookups
CREATE INDEX idx_login_lockouts_identifier ON public.login_lockouts(identifier, identifier_type)

CREATE INDEX idx_login_lockouts_locked_until ON public.login_lockouts(locked_until) WHERE locked_until IS NOT NULL

-- Trigger to update updated_at
CREATE TRIGGER update_login_lockouts_updated_at
  BEFORE UPDATE ON public.login_lockouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column()
