-- Reconstrói as 3 tabelas geo_blocking_* que foram criadas manualmente no
-- banco e nunca tiveram migration (índices/policies já versionados em
-- 20260619153319, 20260619153505, 20260317221345 e 20260712232418).
-- DDL compatível com src/integrations/supabase/types.ts (gerado do banco real).
-- CREATE TABLE IF NOT EXISTS: no-op no banco de produção atual, e permite
-- reconstruir o schema do zero.

CREATE TABLE IF NOT EXISTS public.geo_blocking_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled boolean NOT NULL DEFAULT false,
  mode text NOT NULL DEFAULT 'blocklist',
  block_unknown_countries boolean NOT NULL DEFAULT false,
  log_blocked_attempts boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

CREATE TABLE IF NOT EXISTS public.geo_blocking_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  country_name text NOT NULL,
  is_blocked boolean NOT NULL DEFAULT true,
  block_type text NOT NULL DEFAULT 'country',
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country_code)
);

CREATE TABLE IF NOT EXISTS public.geo_blocking_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address inet NOT NULL,
  country_code text,
  country_name text,
  action text NOT NULL,
  user_id uuid,
  user_agent text,
  request_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.geo_blocking_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geo_blocking_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geo_blocking_logs ENABLE ROW LEVEL SECURITY;

-- Policies de SELECT já existem (20260317221345): coordenador/gerente.
-- Policies de INSERT nos logs já existem (20260712232418).
-- Abaixo as policies de escrita que só existiam no banco (criadas a mão),
-- necessárias para o CRUD que useGeoBlocking faz.

DROP POLICY IF EXISTS "Coordinators and managers can manage geo settings" ON public.geo_blocking_settings;
CREATE POLICY "Coordinators and managers can manage geo settings" ON public.geo_blocking_settings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Coordinators and managers can manage geo rules" ON public.geo_blocking_rules;
CREATE POLICY "Coordinators and managers can manage geo rules" ON public.geo_blocking_rules
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Leitura dos logs pela UI de admin (a policy de SELECT para logs nunca foi
-- versionada; o hook geo_blocking_logs.select('*') depende dela).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'geo_blocking_logs' AND cmd = 'SELECT'
  ) THEN
    EXECUTE 'CREATE POLICY "Coordinators and managers can view geo logs" ON public.geo_blocking_logs
      FOR SELECT TO authenticated
      USING (has_role(auth.uid(), ''coordinator''::app_role) OR has_role(auth.uid(), ''manager''::app_role) OR has_role(auth.uid(), ''admin''::app_role))';
  END IF;
END $$;
