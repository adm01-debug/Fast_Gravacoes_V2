-- 1) notify_loss_risk(): a versão de 20260508144832 consulta uma relação
-- `secrets` que não existe em nenhuma migration (era tabela customizada de
-- outro ambiente). Qualquer INSERT em tpm_execution_alerts com
-- severity='critical' ou alert_type='out_of_range' abortava com
-- `relation "secrets" does not exist` — derrubando junto a transação de
-- conclusão de manutenção. Reescreve usando os mesmos GUCs de ambiente do
-- trigger_send_tpm_email (app.settings.functions_base_url +
-- app.settings.service_role_key), e trata a notificação como best-effort:
-- falha no POST não pode abortar o INSERT do alerta.
CREATE OR REPLACE FUNCTION public.notify_loss_risk()
RETURNS TRIGGER AS $$
DECLARE
  v_base_url text := current_setting('app.settings.functions_base_url', true);
BEGIN
  IF (NEW.severity = 'critical' OR NEW.alert_type = 'out_of_range') THEN
    IF coalesce(v_base_url, '') = '' THEN
      RAISE WARNING 'app.settings.functions_base_url não configurado — alerta de risco de perda não notificado';
    ELSE
      BEGIN
        PERFORM
          net.http_post(
            url := v_base_url || '/send-loss-risk-alert',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'x-cron-secret', coalesce(current_setting('app.settings.cron_secret', true), ''),
              'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
            ),
            body := jsonb_build_object(
              'record', row_to_json(NEW),
              'event_type', 'INSERT'
            )
          );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'notify_loss_risk: falha ao notificar (%)', SQLERRM;
      END;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2) tpm_parameter_alerts: a rota /tpm permite 'manager', e o modal gera
-- parameter_alerts quando um valor sai da faixa. A policy "Coordinators and
-- admins can manage alerts" (FOR ALL) só cobre admin/coordinator — um
-- manager concluindo manutenção tomava erro de RLS no insert e a conclusão
-- abortava. Policy separada só para INSERT, sem ampliar UPDATE/DELETE.
DROP POLICY IF EXISTS "Managers can create parameter alerts" ON public.tpm_parameter_alerts;
CREATE POLICY "Managers can create parameter alerts"
ON public.tpm_parameter_alerts
FOR INSERT
TO authenticated
WITH CHECK (
  app_private.has_role(auth.uid(), 'manager'::app_role)
);
