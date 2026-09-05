
-- 1) user_roles: bloqueia coordenador/manager de alterar linhas admin/manager
DROP POLICY IF EXISTS "Staff can update non-privileged roles" ON public.user_roles;
CREATE POLICY "Staff can update non-privileged roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (
    (public.has_role(auth.uid(), 'coordinator'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role))
    AND role NOT IN ('admin'::app_role, 'manager'::app_role)
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (
    (public.has_role(auth.uid(), 'coordinator'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role))
    AND role NOT IN ('admin'::app_role, 'manager'::app_role)
  )
);

-- 2) inventory_items
DROP POLICY IF EXISTS "Inventory items managed by managers/coordinators" ON public.inventory_items;
CREATE POLICY "Inventory items managed by managers/coordinators"
ON public.inventory_items
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'manager'::app_role)
  OR public.has_role(auth.uid(), 'coordinator'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'manager'::app_role)
  OR public.has_role(auth.uid(), 'coordinator'::app_role)
);

-- 3) tpm_parameter_alerts
DROP POLICY IF EXISTS "Coordinators and admins can manage alerts" ON public.tpm_parameter_alerts;
CREATE POLICY "Coordinators and admins can manage alerts"
ON public.tpm_parameter_alerts
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'coordinator'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'coordinator'::app_role)
);

-- 4) shipments
DROP POLICY IF EXISTS "Coordinators and above can manage shipments" ON public.shipments;
CREATE POLICY "Coordinators and above can manage shipments"
ON public.shipments
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'manager'::app_role)
  OR public.has_role(auth.uid(), 'coordinator'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'manager'::app_role)
  OR public.has_role(auth.uid(), 'coordinator'::app_role)
);

-- 5) shipping_providers
DROP POLICY IF EXISTS "Managers and admins can manage shipping providers" ON public.shipping_providers;
CREATE POLICY "Managers and admins can manage shipping providers"
ON public.shipping_providers
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'manager'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'manager'::app_role)
);

-- 6) Storage: remove política duplicada
DROP POLICY IF EXISTS "Authenticated users can delete production photos" ON storage.objects;
