-- Create table for WebAuthn credentials
CREATE TABLE public.webauthn_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter BIGINT NOT NULL DEFAULT 0,
  device_name TEXT,
  transports TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE
)

-- Enable RLS
ALTER TABLE public.webauthn_credentials ENABLE ROW LEVEL SECURITY

-- Users can view their own credentials
CREATE POLICY "Users can view own credentials"
ON public.webauthn_credentials
FOR SELECT
USING (auth.uid() = user_id)

-- Users can insert their own credentials
CREATE POLICY "Users can insert own credentials"
ON public.webauthn_credentials
FOR INSERT
WITH CHECK (auth.uid() = user_id)

-- Users can delete their own credentials
CREATE POLICY "Users can delete own credentials"
ON public.webauthn_credentials
FOR DELETE
USING (auth.uid() = user_id)

-- Users can update their own credentials
CREATE POLICY "Users can update own credentials"
ON public.webauthn_credentials
FOR UPDATE
USING (auth.uid() = user_id)

-- Create table for WebAuthn challenges (temporary storage)
CREATE TABLE public.webauthn_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,
  challenge TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('registration', 'authentication')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '5 minutes'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Enable RLS
ALTER TABLE public.webauthn_challenges ENABLE ROW LEVEL SECURITY

-- System can manage challenges
CREATE POLICY "System can manage challenges"
ON public.webauthn_challenges
FOR ALL
USING (true)
WITH CHECK (true)

-- Add index for faster lookups
CREATE INDEX idx_webauthn_credentials_user_id ON public.webauthn_credentials(user_id)

CREATE INDEX idx_webauthn_challenges_expires_at ON public.webauthn_challenges(expires_at)
