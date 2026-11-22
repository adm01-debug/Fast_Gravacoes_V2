-- Rate Limit Logs table
CREATE TABLE public.rate_limit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address INET NOT NULL,
  endpoint TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  window_end TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '1 minute'),
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Blocked IPs table (automatic blocking from rate limiting)
CREATE TABLE public.blocked_ips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address INET NOT NULL,
  reason TEXT NOT NULL,
  blocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_permanent BOOLEAN NOT NULL DEFAULT false,
  blocked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  unblocked_at TIMESTAMP WITH TIME ZONE,
  unblocked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  request_count_at_block INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Rate Limit Settings table
CREATE TABLE public.rate_limit_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint_pattern TEXT NOT NULL,
  max_requests INTEGER NOT NULL DEFAULT 100,
  window_seconds INTEGER NOT NULL DEFAULT 60,
  block_duration_minutes INTEGER NOT NULL DEFAULT 15,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Security Events table (for comprehensive audit trail)
CREATE TABLE public.security_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  ip_address INET,
  user_agent TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Email Verification Tokens table
CREATE TABLE public.email_verification_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Enable RLS
ALTER TABLE public.rate_limit_logs ENABLE ROW LEVEL SECURITY

ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY

ALTER TABLE public.rate_limit_settings ENABLE ROW LEVEL SECURITY

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY

ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY

-- RLS Policies for rate_limit_logs
CREATE POLICY "Coordinators and managers can view rate limit logs"
ON public.rate_limit_logs FOR SELECT
USING (has_role(auth.uid(), 'coordinator') OR has_role(auth.uid(), 'manager'))

CREATE POLICY "System can insert rate limit logs"
ON public.rate_limit_logs FOR INSERT
WITH CHECK (true)

-- RLS Policies for blocked_ips
CREATE POLICY "Coordinators can manage blocked IPs"
ON public.blocked_ips FOR ALL
USING (has_role(auth.uid(), 'coordinator'))
WITH CHECK (has_role(auth.uid(), 'coordinator'))

CREATE POLICY "Managers can view blocked IPs"
ON public.blocked_ips FOR SELECT
USING (has_role(auth.uid(), 'manager'))

-- RLS Policies for rate_limit_settings
CREATE POLICY "Coordinators can manage rate limit settings"
ON public.rate_limit_settings FOR ALL
USING (has_role(auth.uid(), 'coordinator'))
WITH CHECK (has_role(auth.uid(), 'coordinator'))

CREATE POLICY "Managers can view rate limit settings"
ON public.rate_limit_settings FOR SELECT
USING (has_role(auth.uid(), 'manager'))

-- RLS Policies for security_events
CREATE POLICY "Coordinators and managers can view security events"
ON public.security_events FOR SELECT
USING (has_role(auth.uid(), 'coordinator') OR has_role(auth.uid(), 'manager'))

CREATE POLICY "System can insert security events"
ON public.security_events FOR INSERT
WITH CHECK (true)

-- RLS Policies for email_verification_tokens
CREATE POLICY "Users can view own verification tokens"
ON public.email_verification_tokens FOR SELECT
USING (auth.uid() = user_id)

CREATE POLICY "System can manage verification tokens"
ON public.email_verification_tokens FOR ALL
USING (true)
WITH CHECK (true)

-- Create indexes for performance
CREATE INDEX idx_rate_limit_logs_ip ON public.rate_limit_logs(ip_address)

CREATE INDEX idx_rate_limit_logs_created ON public.rate_limit_logs(created_at DESC)

CREATE INDEX idx_blocked_ips_ip ON public.blocked_ips(ip_address)

CREATE INDEX idx_blocked_ips_active ON public.blocked_ips(ip_address) WHERE unblocked_at IS NULL

CREATE INDEX idx_security_events_type ON public.security_events(event_type)

CREATE INDEX idx_security_events_created ON public.security_events(created_at DESC)

CREATE INDEX idx_security_events_user ON public.security_events(user_id)

-- Enable realtime for security events
ALTER PUBLICATION supabase_realtime ADD TABLE public.security_events

ALTER PUBLICATION supabase_realtime ADD TABLE public.blocked_ips

-- Insert default rate limit settings
INSERT INTO public.rate_limit_settings (endpoint_pattern, max_requests, window_seconds, block_duration_minutes)
VALUES 
  ('/auth/login', 5, 60, 15),
  ('/auth/signup', 3, 60, 30),
  ('/api/*', 100, 60, 5),
  ('*', 200, 60, 10)
