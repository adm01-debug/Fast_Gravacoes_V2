-- Reconstrói as 3 tabelas geo_blocking_* que foram criadas manualmente no
-- banco e nunca tiveram migration. DDL compatível com
-- src/integrations/supabase/types.ts (gerado do banco real).
-- CREATE TABLE IF NOT EXISTS: no-op no banco de produção atual.
-- Os índices/policies de 20260619153319 e 20260712232418 ficaram guardados em
-- to_regclass (as tabelas não existiam no histórico) — os objetos que um
-- rebuild limpo pularia são recriados abaixo. has_role é chamado via
-- app_private (public.has_role foi revogada de authenticated em 20260619160053).

-- Garante app_private.has_role: no remoto construído fora da cadeia
-- versionada (Lovable/SQL Editor), 20260619160053 foi marcada `applied` via
-- `supabase migration repair` sem executar — o schema nunca foi criado e
-- todas as policies remotas ainda chamam public.has_role. Este bloco é a
-- primeira coisa que roda porque esta é a primeira migration pendente que
-- usa app_private. Idempotente (IF NOT EXISTS / OR REPLACE): no-op onde o
-- schema já existe.
-- Divergência intencional de 20260619160053: NÃO revoga public.has_role de
-- authenticated e NÃO reescreve policies existentes — no remoto divergente
-- elas dependem de public.has_role, e revogar quebraria todas as RLS.
CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM public, anon, authenticated;
GRANT USAGE ON SCHEMA app_private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION app_private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND is_active = true
  )
$$;

REVOKE ALL ON FUNCTION app_private.has_role(uuid, public.app_role) FROM public, anon;
GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) TO authenticated, service_role;

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

-- Índices de 20260619153319 (guardados em to_regclass): num rebuild limpo
-- seriam pulados, então são recriados aqui.
CREATE INDEX IF NOT EXISTS idx_geo_blocking_rules_created_by ON public.geo_blocking_rules(created_by);
CREATE INDEX IF NOT EXISTS idx_geo_blocking_settings_updated_by ON public.geo_blocking_settings(updated_by);

-- Policies de SELECT (20260317221345) e INSERT nos logs (20260712232418) são
-- guardadas ou usam public.has_role (revogada) — recriadas abaixo com
-- app_private.has_role. Abaixo também as policies de escrita que só existiam
-- no banco (criadas a mão), necessárias para o CRUD que useGeoBlocking faz.

DROP POLICY IF EXISTS "Coordinators and managers can manage geo settings" ON public.geo_blocking_settings;
CREATE POLICY "Coordinators and managers can manage geo settings" ON public.geo_blocking_settings
  FOR ALL TO authenticated
  USING (app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Coordinators and managers can manage geo rules" ON public.geo_blocking_rules;
CREATE POLICY "Coordinators and managers can manage geo rules" ON public.geo_blocking_rules
  FOR ALL TO authenticated
  USING (app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role));

-- INSERT nos logs (20260712232418 usava public.has_role, revogada — a policy
-- fica quebrada para authenticated; recriada aqui com app_private).
DROP POLICY IF EXISTS "Users can insert own log entries" ON public.geo_blocking_logs;
DROP POLICY IF EXISTS "Authenticated can insert geo logs" ON public.geo_blocking_logs;
CREATE POLICY "Users can insert own log entries" ON public.geo_blocking_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL OR app_private.has_role(auth.uid(),'coordinator'::app_role) OR app_private.has_role(auth.uid(),'manager'::app_role) OR app_private.has_role(auth.uid(),'admin'::app_role));

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
      USING (app_private.has_role(auth.uid(), ''coordinator''::app_role) OR app_private.has_role(auth.uid(), ''manager''::app_role) OR app_private.has_role(auth.uid(), ''admin''::app_role))';
  END IF;
END $$;
