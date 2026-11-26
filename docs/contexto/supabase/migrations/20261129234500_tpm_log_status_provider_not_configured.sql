-- Etapa 016 (seguimento): permitir o status 'provider_not_configured' no log de TPM.
--
-- A funcao supabase/functions/tpm-notifications/index.ts passou a registrar TODA
-- tentativa que nao entrega, usando status 'provider_not_configured' quando o
-- canal nao tem provedor configurado. O CHECK tpm_notification_logs_status_check
-- (criado em migration anterior) aceitava apenas 'success' e 'failure': o insert
-- da funcao era recusado pelo banco e, como o erro nao era verificado, ficava
-- silencioso. Resultado em producao: nenhuma linha no log e a tela de logs sem o
-- rotulo "Sem provedor" (comprovado em 26/11/2026 - fila processada, status da
-- fila 'failed', tpm_notification_logs vazio).
--
-- A constraint passa a aceitar os tres valores que o codigo escreve.
ALTER TABLE public.tpm_notification_logs
  DROP CONSTRAINT IF EXISTS tpm_notification_logs_status_check

ALTER TABLE public.tpm_notification_logs
  ADD CONSTRAINT tpm_notification_logs_status_check
  CHECK (status = ANY (ARRAY['success'::text, 'failure'::text, 'provider_not_configured'::text]))
