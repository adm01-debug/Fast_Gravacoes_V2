-- Managers também gerenciam agendamentos TPM.
-- A policy existente só permite coordinator; a RPC
-- approve_maintenance_record (SECURITY INVOKER) roda o update do
-- agendamento com as permissões do aprovador — um aprovador manager
-- derrubava a transação inteira. Managers são hierarquicamente
-- superiores e já acessam /tpm (AppRoutes).
CREATE POLICY "Managers can manage maintenance schedules"
  ON public.maintenance_schedules FOR ALL
  USING (has_role(auth.uid(), 'manager'))
  WITH CHECK (has_role(auth.uid(), 'manager'));

-- Admins bypassam o guard de rota /tpm e também podem aprovar — sem
-- essa policy a RPC de aprovação atualizaria o agendamento filtrado a
-- zero linhas em silêncio para eles.
CREATE POLICY "Admins can manage maintenance schedules"
  ON public.maintenance_schedules FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));
