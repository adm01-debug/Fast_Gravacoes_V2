-- Enforce energy:read no acesso de leitura as telas de energia (F-007).
--
-- Rodada 3 (threads kNO7/kNOf/kNPV/kNP8/kNQT do Devin review):
--   1. has_permission() sem parametro de user_id: usa auth.uid() fixo no corpo.
--      (antes aceitava qualquer uuid e vazava permissoes de terceiros - SEC)
--   2. Bypass de admin exigindo perfil admin real via app_private.has_role,
--      alem de admin:all na role: admin:all em role comum nao contorna a
--      revogacao; e admin ativo le mesmo sem linha em role_permissions.
--   3. Policies de escrita convertidas de public.has_role / has_any_active_role
--      (EXECUTE revogado de authenticated em 2026-06-19/2026-07-11) para
--      app_private.has_role - padrao do repo (ver 20261001143000).
--
-- Depende de app_private.has_role (20260619160053), role_permissions
-- (20251231125744) e user_roles (20251213011430) ja aplicadas.

-- Funcao auxiliar: usuario autenticado possui determinada permissao.
-- Admin: o runtime concede acesso total implicitamente (hasPermission retorna
-- true para role 'admin'); espelhamos aqui para nao regredir o admin que tenha
-- revogado alguma permissao pontual no banco.
CREATE OR REPLACE FUNCTION public.has_permission(_permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT app_private.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.role_permissions rp ON ur.role = rp.role
      WHERE ur.user_id = auth.uid()
        AND ur.is_active = true
        AND rp.is_granted = true
        AND (
          rp.permission = _permission
          -- admin:all so contorna a revogacao para perfil admin REAL: a thread
          -- SEC do review apontou que admin:all em role comum (ex.: concession
          -- via PermissionManager) promovia a role a admin sem ter o perfil.
          OR (rp.permission = 'admin:all' AND ur.role = 'admin'::app_role)
        )
    );
$$

-- Permite que chamadores autenticados (nao apenas postgres/definer) avaliem as
-- policies que usam a funcao.
REVOKE ALL ON FUNCTION public.has_permission(text) FROM PUBLIC

GRANT EXECUTE ON FUNCTION public.has_permission(text) TO authenticated

GRANT EXECUTE ON FUNCTION public.has_permission(text) TO service_role

-- energy_consumption: leitura exige energy:read; escrita segue coordinator-only
-- (INSERT/UPDATE/DELETE separados - a antiga policy FOR ALL vazava SELECT).
DROP POLICY IF EXISTS "Active users can view energy consumption" ON public.energy_consumption

DROP POLICY IF EXISTS "Coordinators can manage energy consumption" ON public.energy_consumption

CREATE POLICY "Energy readers can view energy consumption"
  ON public.energy_consumption FOR SELECT TO authenticated
  USING (public.has_permission('energy:read'))

CREATE POLICY "Coordinators can create energy consumption"
  ON public.energy_consumption FOR INSERT TO authenticated
  WITH CHECK (app_private.has_role(auth.uid(), 'coordinator'::app_role))

CREATE POLICY "Coordinators can update energy consumption"
  ON public.energy_consumption FOR UPDATE TO authenticated
  USING (app_private.has_role(auth.uid(), 'coordinator'::app_role))
  WITH CHECK (app_private.has_role(auth.uid(), 'coordinator'::app_role))

CREATE POLICY "Coordinators can delete energy consumption"
  ON public.energy_consumption FOR DELETE TO authenticated
  USING (app_private.has_role(auth.uid(), 'coordinator'::app_role))

-- energy_alerts: leitura exige energy:read; escrita continua para role ativa
-- (regra atual da policy ALL), agora sem vazar SELECT e via app_private.
DROP POLICY IF EXISTS "Active users can view energy alerts" ON public.energy_alerts

DROP POLICY IF EXISTS "Active roles can manage energy alerts" ON public.energy_alerts

CREATE POLICY "Energy readers can view energy alerts"
  ON public.energy_alerts FOR SELECT TO authenticated
  USING (public.has_permission('energy:read'))

CREATE POLICY "Active roles can create energy alerts"
  ON public.energy_alerts FOR INSERT TO authenticated
  WITH CHECK (
    app_private.has_role(auth.uid(), 'coordinator'::app_role)
    OR app_private.has_role(auth.uid(), 'manager'::app_role)
    OR app_private.has_role(auth.uid(), 'operator'::app_role)
    OR app_private.has_role(auth.uid(), 'admin'::app_role)
  )

CREATE POLICY "Active roles can update energy alerts"
  ON public.energy_alerts FOR UPDATE TO authenticated
  USING (
    app_private.has_role(auth.uid(), 'coordinator'::app_role)
    OR app_private.has_role(auth.uid(), 'manager'::app_role)
    OR app_private.has_role(auth.uid(), 'operator'::app_role)
    OR app_private.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    app_private.has_role(auth.uid(), 'coordinator'::app_role)
    OR app_private.has_role(auth.uid(), 'manager'::app_role)
    OR app_private.has_role(auth.uid(), 'operator'::app_role)
    OR app_private.has_role(auth.uid(), 'admin'::app_role)
  )

CREATE POLICY "Active roles can delete energy alerts"
  ON public.energy_alerts FOR DELETE TO authenticated
  USING (
    app_private.has_role(auth.uid(), 'coordinator'::app_role)
    OR app_private.has_role(auth.uid(), 'manager'::app_role)
    OR app_private.has_role(auth.uid(), 'operator'::app_role)
    OR app_private.has_role(auth.uid(), 'admin'::app_role)
  )

-- energy_targets: leitura exige energy:read; escrita permanece coordinator-only.
DROP POLICY IF EXISTS "Active users can view energy targets" ON public.energy_targets

DROP POLICY IF EXISTS "Coordinators can manage energy targets" ON public.energy_targets

CREATE POLICY "Energy readers can view energy targets"
  ON public.energy_targets FOR SELECT TO authenticated
  USING (public.has_permission('energy:read'))

CREATE POLICY "Coordinators can create energy targets"
  ON public.energy_targets FOR INSERT TO authenticated
  WITH CHECK (app_private.has_role(auth.uid(), 'coordinator'::app_role))

CREATE POLICY "Coordinators can update energy targets"
  ON public.energy_targets FOR UPDATE TO authenticated
  USING (app_private.has_role(auth.uid(), 'coordinator'::app_role))
  WITH CHECK (app_private.has_role(auth.uid(), 'coordinator'::app_role))

CREATE POLICY "Coordinators can delete energy targets"
  ON public.energy_targets FOR DELETE TO authenticated
  USING (app_private.has_role(auth.uid(), 'coordinator'::app_role))
