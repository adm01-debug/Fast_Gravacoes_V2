-- Remove policies recursivas antigas (faziam SELECT em user_roles dentro da
-- policy do próprio user_roles, causando loop → 500 no PostgREST).
DROP POLICY IF EXISTS "Users view own profile or staff view all" ON public.profiles;
DROP POLICY IF EXISTS "Staff can view all user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Staff can view all profiles" ON public.profiles;

-- Função helper que checa se o caller é staff. SECURITY DEFINER para não
-- passar pelo RLS de user_roles (era o que causava recursão).
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('coordinator','manager','admin')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated, anon;

-- Agora as policies chamam is_staff() (SECURITY DEFINER) em vez de fazer
-- SELECT inline em user_roles. Sem recursão.
CREATE POLICY "Staff can view all user_roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR public.is_staff()
);

CREATE POLICY "Staff can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid() OR public.is_staff()
);