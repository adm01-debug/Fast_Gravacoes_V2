
-- Substituir policy ampla "Only managers can manage user roles"
DROP POLICY IF EXISTS "Only managers can manage user roles" ON public.user_roles;

-- Managers: podem gerenciar papéis, exceto conceder admin ou manager
CREATE POLICY "Managers can manage non-privileged roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (
    app_private.has_role((SELECT auth.uid()), 'manager'::app_role)
    AND role NOT IN ('admin'::app_role, 'manager'::app_role)
  )
  WITH CHECK (
    app_private.has_role((SELECT auth.uid()), 'manager'::app_role)
    AND role NOT IN ('admin'::app_role, 'manager'::app_role)
  );

-- Admins: controle total sobre user_roles
CREATE POLICY "Admins can manage all user roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (app_private.has_role((SELECT auth.uid()), 'admin'::app_role))
  WITH CHECK (app_private.has_role((SELECT auth.uid()), 'admin'::app_role));

-- Restringir UPDATE dos papéis: valor novo não pode ser admin/manager (a menos que admin)
DROP POLICY IF EXISTS "Managers can update roles" ON public.user_roles;
CREATE POLICY "Staff can update non-privileged roles"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (
    app_private.has_role((SELECT auth.uid()), 'coordinator'::app_role)
    OR app_private.has_role((SELECT auth.uid()), 'manager'::app_role)
    OR app_private.has_role((SELECT auth.uid()), 'admin'::app_role)
  )
  WITH CHECK (
    app_private.has_role((SELECT auth.uid()), 'admin'::app_role)
    OR (
      app_private.has_role((SELECT auth.uid()), 'manager'::app_role)
      AND role NOT IN ('admin'::app_role, 'manager'::app_role)
    )
    OR (
      app_private.has_role((SELECT auth.uid()), 'coordinator'::app_role)
      AND role = 'operator'::app_role
    )
  );
