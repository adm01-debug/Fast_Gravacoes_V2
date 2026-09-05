
-- profiles: restringir leitura
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
CREATE POLICY "Users view own profile or staff view all"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR public.has_role((SELECT auth.uid()), 'coordinator'::app_role)
    OR public.has_role((SELECT auth.uid()), 'manager'::app_role)
    OR public.has_role((SELECT auth.uid()), 'admin'::app_role)
  );

-- inventory_items
DROP POLICY IF EXISTS "Inventory items viewable by authenticated users" ON public.inventory_items;
CREATE POLICY "Active roles can view inventory items"
  ON public.inventory_items FOR SELECT TO authenticated
  USING (public.has_any_active_role());

-- inventory_movements
DROP POLICY IF EXISTS "Movements viewable by authenticated users" ON public.inventory_movements;
CREATE POLICY "Active roles can view inventory movements"
  ON public.inventory_movements FOR SELECT TO authenticated
  USING (public.has_any_active_role());

-- shipments
DROP POLICY IF EXISTS "Shipments are viewable by all authenticated users" ON public.shipments;
CREATE POLICY "Active roles can view shipments"
  ON public.shipments FOR SELECT TO authenticated
  USING (public.has_any_active_role());

-- shipping_providers
DROP POLICY IF EXISTS "Shipping providers are viewable by all authenticated users" ON public.shipping_providers;
CREATE POLICY "Active roles can view shipping providers"
  ON public.shipping_providers FOR SELECT TO authenticated
  USING (public.has_any_active_role());

-- production_losses
DROP POLICY IF EXISTS "Operators can insert losses" ON public.production_losses;
CREATE POLICY "Active roles can insert losses"
  ON public.production_losses FOR INSERT TO authenticated
  WITH CHECK (public.has_any_active_role());

-- tpm_execution_audit_logs
DROP POLICY IF EXISTS "Audit logs are viewable by authenticated users" ON public.tpm_execution_audit_logs;
CREATE POLICY "Active roles can view tpm execution audit logs"
  ON public.tpm_execution_audit_logs FOR SELECT TO authenticated
  USING (public.has_any_active_role());
