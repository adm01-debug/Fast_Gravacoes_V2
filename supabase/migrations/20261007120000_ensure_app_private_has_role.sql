-- Cria o schema app_private + app_private.has_role quando o remoto foi
-- construído fora da cadeia versionada (Lovable/SQL Editor): a migration
-- 20260619160053, que criava ambos e reescrevia as policies para
-- app_private, foi marcada como `applied` via `supabase migration repair`
-- sem executar — então o remoto segue com public.has_role nas policies.
-- Sem este schema, migrations mais novas falham com
-- `schema "app_private" does not exist`.
--
-- Idempotente: CREATE SCHEMA IF NOT EXISTS / OR REPLACE tornam este arquivo
-- um no-op em ambientes onde o objeto já existe (ex.: rebuild limpo que
-- executa 20260619160053 de verdade antes desta).
--
-- Divergência intencional de 20260619160053: esta migration NÃO revoga
-- public.has_role de authenticated e NÃO reescreve policies existentes —
-- no remoto divergente elas chamam public.has_role, e revogar quebraria
-- todas as RLS do app. A convergência das policies para
-- app_private.has_role fica para uma reconciliação dedicada.

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
