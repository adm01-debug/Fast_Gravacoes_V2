-- Restaura public.erp_api_keys.
--
-- Contexto: as migrations 20260520000001, 20260521000001 e 20260620000001
-- constam em supabase_migrations.schema_migrations, mas a tabela nao existia
-- no banco de producao (42P01), o que quebrava a autenticacao por x-api-key da
-- edge function erp-api (integracao Promo Design -> Fast Gravacoes).
--
-- Idempotente: recria o mesmo objeto versionado, ja com a policy corrigida
-- (public.has_role(auth.uid(),'manager')) e removendo a policy morta
-- "Only admins can manage API keys", que usava valor inexistente no enum.

CREATE TABLE IF NOT EXISTS public.erp_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE
)

ALTER TABLE public.erp_api_keys ENABLE ROW LEVEL SECURITY

DROP POLICY IF EXISTS "Only admins can manage API keys" ON public.erp_api_keys

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'erp_api_keys'
      AND policyname = 'Managers can manage API keys'
  ) THEN
    CREATE POLICY "Managers can manage API keys"
      ON public.erp_api_keys
      FOR ALL
      USING (public.has_role(auth.uid(), 'manager'::public.app_role))
      WITH CHECK (public.has_role(auth.uid(), 'manager'::public.app_role));
  END IF;
END $$

COMMENT ON TABLE public.erp_api_keys IS
'Stores SHA-256 hashed API keys for ERP integration authentication.'
