-- Item 9: fechar RLS permissivo em tabelas técnicas.
-- Remove policies "FOR ALL" abertas a qualquer autenticado e cria policies
-- restritivas por role (coordinator/manager/admin) para escrita.

-- machine_predictions
DROP POLICY IF EXISTS "Authenticated users can manage predictions" ON public.machine_predictions;
CREATE POLICY "Only coordinators can manage predictions"
  ON public.machine_predictions
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'coordinator')
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'coordinator')
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'admin')
  );

-- machine_health_metrics
DROP POLICY IF EXISTS "Authenticated users can manage health metrics" ON public.machine_health_metrics;
CREATE POLICY "Only coordinators can manage health metrics"
  ON public.machine_health_metrics
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'coordinator')
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'coordinator')
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'admin')
  );

-- spc_capability_history
DROP POLICY IF EXISTS "Authenticated users can manage capability history" ON public.spc_capability_history;
CREATE POLICY "Only coordinators can manage capability history"
  ON public.spc_capability_history
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'coordinator')
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'coordinator')
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'admin')
  );

-- operator_skills
DROP POLICY IF EXISTS "Authenticated users can manage skills" ON public.operator_skills;
-- policy "Coordinators can manage operator skills" já existe; leitura via has_any_active_role permanece.