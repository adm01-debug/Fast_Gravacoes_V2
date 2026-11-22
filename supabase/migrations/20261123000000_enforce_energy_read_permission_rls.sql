-- Enforce energy:read no acesso de leitura as telas de energia (F-007).
--
-- Contexto: a rota /energy passou a exigir a permissao `energy:read` no
-- frontend, mas as policies SELECT de energy_consumption/energy_alerts/
-- energy_targets liberavam qualquer perfil ativo - revogar a permissao
-- escondia a tela sem proteger os dados. Alem disso, as policies FOR ALL
-- ("Coordinators can manage...", "Active roles can manage energy alerts")
-- vazavam SELECT em RLS permissivo para qualquer role ativa mesmo com
-- energy:read revogada. Esta migration amarra a leitura a mesma permissao
-- que o runtime consulta e converte as policies de escrita em
-- INSERT/UPDATE/DELETE-only, fechando os dois gaps de autorizacao.
--
-- Depende de public.has_role / public.has_any_active_role (migrations
-- 20251213011430, 20260317221345, 20260712230950) e da tabela
-- role_permissions (migration 20251231125744) ja aplicadas.

-- Funcao auxiliar: usuario ativo possui determinada permissao.
-- Admin: o runtime concede acesso total implicitamente (hasPermission retorna
-- true para role==='admin'); espelhamos isso aqui para nao regredir o admin
-- que tenha revogado alguma permissao pontual no banco.
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.role_permissions rp
    JOIN public.user_roles ur ON ur.user_id = _user_id AND ur.is_active = true
    WHERE ur.role = rp.role
      AND rp.is_granted = true
      AND (rp.permission = _permission OR rp.permission = 'admin:all')
  );
$$;

-- Permite que chamadores autenticados (nao apenas postgres/definer) avaliem as
-- policies que usam a funcao.
REVOKE ALL ON FUNCTION public.has_permission(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO service_role;

-- energy_consumption: leitura exige energy:read; escrita segue coordinator-only
-- (INSERT/UPDATE/DELETE separados - a antiga policy FOR ALL vazava SELECT).
DROP POLICY IF EXISTS "Active users can view energy consumption" ON public.energy_consumption;
DROP POLICY IF EXISTS "Coordinators can manage energy consumption" ON public.energy_consumption;
CREATE POLICY "Energy readers can view energy consumption"
  ON public.energy_consumption FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'energy:read'));
CREATE POLICY "Coordinators can create energy consumption"
  ON public.energy_consumption FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'coordinator'));
CREATE POLICY "Coordinators can update energy consumption"
  ON public.energy_consumption FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'coordinator'))
  WITH CHECK (public.has_role(auth.uid(), 'coordinator'));
CREATE POLICY "Coordinators can delete energy consumption"
  ON public.energy_consumption FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'coordinator'));

-- energy_alerts: leitura exige energy:read; escrita continua com
-- has_any_active_role (regra atual da policy ALL), agora sem vazar SELECT.
DROP POLICY IF EXISTS "Active users can view energy alerts" ON public.energy_alerts;
DROP POLICY IF EXISTS "Active roles can manage energy alerts" ON public.energy_alerts;
CREATE POLICY "Energy readers can view energy alerts"
  ON public.energy_alerts FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'energy:read'));
CREATE POLICY "Active roles can create energy alerts"
  ON public.energy_alerts FOR INSERT TO authenticated
  WITH CHECK (public.has_any_active_role());
CREATE POLICY "Active roles can update energy alerts"
  ON public.energy_alerts FOR UPDATE TO authenticated
  USING (public.has_any_active_role())
  WITH CHECK (public.has_any_active_role());
CREATE POLICY "Active roles can delete energy alerts"
  ON public.energy_alerts FOR DELETE TO authenticated
  USING (public.has_any_active_role());

-- energy_targets: leitura exige energy:read; escrita permanece coordinator-only.
DROP POLICY IF EXISTS "Active users can view energy targets" ON public.energy_targets;
DROP POLICY IF EXISTS "Coordinators can manage energy targets" ON public.energy_targets;
CREATE POLICY "Energy readers can view energy targets"
  ON public.energy_targets FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'energy:read'));
CREATE POLICY "Coordinators can create energy targets"
  ON public.energy_targets FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'coordinator'));
CREATE POLICY "Coordinators can update energy targets"
  ON public.energy_targets FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'coordinator'))
  WITH CHECK (public.has_role(auth.uid(), 'coordinator'));
CREATE POLICY "Coordinators can delete energy targets"
  ON public.energy_targets FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'coordinator'));
