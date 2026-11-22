-- Table for IP allowlist
CREATE TABLE public.ip_allowlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address inet NOT NULL,
  description text,
  is_global boolean NOT NULL DEFAULT false,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT ip_or_global CHECK (is_global = true OR user_id IS NOT NULL)
)

-- Index for faster IP lookups
CREATE INDEX idx_ip_allowlist_ip ON public.ip_allowlist(ip_address)

CREATE INDEX idx_ip_allowlist_user ON public.ip_allowlist(user_id) WHERE user_id IS NOT NULL

-- Enable RLS
ALTER TABLE public.ip_allowlist ENABLE ROW LEVEL SECURITY

-- Only coordinators/managers can view and manage IP allowlist
CREATE POLICY "Coordinators can view IP allowlist"
ON public.ip_allowlist
FOR SELECT
USING (has_role(auth.uid(), 'coordinator') OR has_role(auth.uid(), 'manager'))

CREATE POLICY "Coordinators can manage IP allowlist"
ON public.ip_allowlist
FOR ALL
USING (has_role(auth.uid(), 'coordinator'))
WITH CHECK (has_role(auth.uid(), 'coordinator'))

-- Table to store user 2FA settings
CREATE TABLE public.user_mfa_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  totp_enabled boolean NOT NULL DEFAULT false,
  totp_verified_at timestamp with time zone,
  backup_codes_generated_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
)

-- Enable RLS
ALTER TABLE public.user_mfa_settings ENABLE ROW LEVEL SECURITY

-- Users can view/update their own MFA settings
CREATE POLICY "Users can view own MFA settings"
ON public.user_mfa_settings
FOR SELECT
USING (auth.uid() = user_id)

CREATE POLICY "Users can insert own MFA settings"
ON public.user_mfa_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id)

CREATE POLICY "Users can update own MFA settings"
ON public.user_mfa_settings
FOR UPDATE
USING (auth.uid() = user_id)

-- Coordinators can view all MFA settings
CREATE POLICY "Coordinators can view all MFA settings"
ON public.user_mfa_settings
FOR SELECT
USING (has_role(auth.uid(), 'coordinator') OR has_role(auth.uid(), 'manager'))

-- Table for login audit
CREATE TABLE public.login_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  ip_address inet,
  user_agent text,
  login_status text NOT NULL, -- 'success', 'failed', 'blocked_ip', 'mfa_required', 'mfa_failed'
  failure_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
)

-- Index for audit queries
CREATE INDEX idx_login_audit_user ON public.login_audit(user_id)

CREATE INDEX idx_login_audit_created ON public.login_audit(created_at DESC)

-- Enable RLS
ALTER TABLE public.login_audit ENABLE ROW LEVEL SECURITY

-- Users can view their own login history
CREATE POLICY "Users can view own login audit"
ON public.login_audit
FOR SELECT
USING (auth.uid() = user_id)

-- System can insert audit records
CREATE POLICY "System can insert audit records"
ON public.login_audit
FOR INSERT
WITH CHECK (true)

-- Coordinators can view all audit records
CREATE POLICY "Coordinators can view all login audit"
ON public.login_audit
FOR SELECT
USING (has_role(auth.uid(), 'coordinator') OR has_role(auth.uid(), 'manager'))
