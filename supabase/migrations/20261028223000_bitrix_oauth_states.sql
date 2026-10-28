-- Estados OAuth do Bitrix24 de uso único.
-- Com verify_jwt=false em bitrix24-sync, um `state` HMAC stateless podia ser
-- reutilizado por quem o capturasse (logs, referrer) dentro da janela de 15min
-- para trocar o `code` e substituir os tokens armazenados. Persistir o state
-- emitido e consumi-lo no callback torna o fluxo single-use.
CREATE TABLE IF NOT EXISTS public.bitrix24_oauth_states (
  state       text PRIMARY KEY,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bitrix24_oauth_states ENABLE ROW LEVEL SECURITY;

-- Mesma convenção de bitrix24_oauth_tokens: ninguém acessa via PostgREST;
-- a edge function opera como service_role (bypassa RLS).
CREATE POLICY "Service role only access"
ON public.bitrix24_oauth_states
FOR ALL
USING (false)
WITH CHECK (false);
