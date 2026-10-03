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

-- 2) handle_parameter_alert_notification(): SECURITY INVOKER que consulta
-- auth.users — o role authenticated não lê auth.users, então todo INSERT em
-- tpm_parameter_alerts de um usuário com assinatura de e-mail abortava com
-- permission denied (derrubando a conclusão de manutenção). Vira SECURITY
-- DEFINER (owner lê auth.users) e best-effort: erro na notificação não pode
-- abortar o INSERT do alerta.
CREATE OR REPLACE FUNCTION public.handle_parameter_alert_notification()
RETURNS TRIGGER AS $$
DECLARE
  rec_user RECORD;
  var_machine_id UUID;
  var_machine_name TEXT;
  var_machine_code TEXT;
  var_email TEXT;
BEGIN
  SELECT mr.machine_id, m.name, m.code INTO var_machine_id, var_machine_name, var_machine_code
  FROM maintenance_records mr
  JOIN machines m ON m.id = mr.machine_id
  WHERE mr.id = NEW.execution_id;

  FOR rec_user IN
    SELECT user_id, email_enabled, push_enabled
    FROM user_notification_settings
    WHERE 'tpm_alerts' = ANY(notification_types)
  LOOP
    IF rec_user.push_enabled THEN
      INSERT INTO push_notifications (user_id, title, body, data)
      VALUES (
        rec_user.user_id,
        'Desvio de Parâmetro: ' || var_machine_code,
        'A máquina ' || var_machine_name || ' apresentou desvio no parâmetro ' || NEW.parameter_name || '. Valor: ' || NEW.recorded_value,
        jsonb_build_object('execution_id', NEW.execution_id, 'type', 'parameter_alert')
      );
    END IF;

    IF rec_user.email_enabled THEN
      SELECT email INTO var_email FROM auth.users WHERE id = rec_user.user_id;

      IF var_email IS NOT NULL THEN
        INSERT INTO tpm_notification_queue (machine_id, channel, severity, recipient, payload)
        VALUES (
          var_machine_id,
          'email',
          NEW.severity,
          var_email,
          jsonb_build_object(
            'type', 'parameter_deviation',
            'execution_id', NEW.execution_id,
            'parameter', NEW.parameter_name,
            'recorded_value', NEW.recorded_value,
            'recommended_range', NEW.recommended_range,
            'machine_name', var_machine_name,
            'machine_code', var_machine_code
          )
        );
      END IF;
    END IF;
  END LOOP;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_parameter_alert_notification: falha ao notificar (%)', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3) tpm_parameter_alerts: a rota /tpm permite 'manager', e o modal gera
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
