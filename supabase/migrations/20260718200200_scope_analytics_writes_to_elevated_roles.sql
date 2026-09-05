-- Segurança: prediction_history, operator_rankings e operator_achievements ainda
-- tinham policy FOR ALL USING (auth.uid() IS NOT NULL) — qualquer usuário
-- autenticado (inclusive operador) podia forjar histórico de predições ML e
-- rankings/conquistas de gamificação. Confirmado que TODA escrita legítima vem
-- das edge functions calculate-rankings/ml-predictions via SERVICE_ROLE_KEY
-- (bypassa RLS) — não existe nenhum caminho de escrita client-side nessas 3
-- tabelas (apenas SELECT em useGamification/useOperatorRankings/useMLPredictions).
-- Restringe escrita a coordinator/manager/admin, no mesmo padrão já aplicado a
-- machine_predictions/machine_health_metrics/spc_capability_history (20260711152441).
-- As policies de SELECT USING(true) existentes para leitura NÃO são afetadas
-- (comandos distintos, continuam liberando leitura para todo autenticado).

-- prediction_history
DROP POLICY IF EXISTS "Authenticated users can manage prediction history" ON public.prediction_history;
CREATE POLICY "Only coordinators can manage prediction history"
  ON public.prediction_history
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

-- operator_rankings
DROP POLICY IF EXISTS "Authenticated users can manage rankings" ON public.operator_rankings;
CREATE POLICY "Only coordinators can manage rankings"
  ON public.operator_rankings
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

-- operator_achievements
DROP POLICY IF EXISTS "Authenticated users can manage achievements" ON public.operator_achievements;
CREATE POLICY "Only coordinators can manage achievements"
  ON public.operator_achievements
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

-- Nota: maintenance_item_responses foi deliberadamente NÃO restringida a
-- coordinator/manager nesta migração — operadores preenchem respostas de
-- checklist durante a própria execução de manutenção (fluxo legítimo,
-- MaintenanceExecutionModal → completeMaintenance). A policy atual
-- (has_any_active_role(), aplicada em 20260712230950) já exige role ativa
-- em user_roles, o que é a granularidade correta para esta tabela.
