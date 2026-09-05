-- Staff (coordinator/manager/admin) pode ver todos os user_roles.
-- Necessário para /operators listar operadores.
CREATE POLICY "Staff can view all user_roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('coordinator', 'manager', 'admin')
  )
);

-- Staff pode ver todos os profiles (necessário para o JOIN profiles!inner)
CREATE POLICY "Staff can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('coordinator', 'manager', 'admin')
  )
);