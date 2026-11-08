-- Create table to store Bitrix24 OAuth tokens
CREATE TABLE public.bitrix24_oauth_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Enable RLS
ALTER TABLE public.bitrix24_oauth_tokens ENABLE ROW LEVEL SECURITY

-- Only service role can access (edge functions use service role)
CREATE POLICY "Service role only access" 
ON public.bitrix24_oauth_tokens 
FOR ALL 
USING (false)
WITH CHECK (false)

-- Create trigger for updated_at
CREATE TRIGGER update_bitrix24_oauth_tokens_updated_at
BEFORE UPDATE ON public.bitrix24_oauth_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column()
