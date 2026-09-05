-- ============================================================
-- Fase 3: Hardening RLS — substituir USING(true) por papel ativo
-- ============================================================

-- 1) Helper SECURITY DEFINER (sem recursão, search_path fixo)
CREATE OR REPLACE FUNCTION public.has_any_active_role()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND is_active = true
  );
$$;

REVOKE ALL ON FUNCTION public.has_any_active_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_any_active_role() TO authenticated, service_role;

-- 2) Substituir TODAS as políticas SELECT com qual='true' do schema public
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND cmd = 'SELECT'
      AND qual = 'true'
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    EXECUTE format(
      'CREATE POLICY %I ON %I.%I FOR SELECT TO authenticated USING (public.has_any_active_role())',
      r.policyname, r.schemaname, r.tablename
    );
  END LOOP;
END $$;