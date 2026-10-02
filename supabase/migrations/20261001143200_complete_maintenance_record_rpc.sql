-- complete_maintenance_record(payload jsonb)
-- Torna atômica a conclusão de uma execução de manutenção: antes, o cliente
-- fazia 1 UPDATE em maintenance_records + até 5 INSERTs sequenciais
-- (tpm_execution_alerts, tpm_execution_supplies, tpm_parameter_alerts,
-- maintenance_item_responses, tpm_execution_parts). Uma falha no meio do
-- caminho deixava o registro 'completed' sem os dados auxiliares.
-- Agora tudo roda numa única transação no banco.
--
-- SECURITY INVOKER de propósito: as mesmas RLS policies que protegiam os
-- writes diretos continuam valendo — a RPC não abre nenhum acesso novo.
--
-- Payload esperado (chaves 'update'/'execution_alerts'/... são opcionais):
-- {
--   "record_id": "<uuid>",
--   "update": { "notes","total_cost","downtime_minutes","signature",
--               "checklist_version","checklist_snapshot","technical_sheet_id",
--               "technical_sheet_version","adjustment_parameters" },
--   "execution_alerts": [{ "execution_id","alert_type","parameter_name",
--               "expected_range","actual_value","severity","description",
--               "evidence_urls" }],
--   "supplies": [{ "execution_id","name","quantity","alternative_used",
--               "original_recommended_id" }],
--   "parameter_alerts": [{ "execution_id","parameter_name","recorded_value",
--               "recommended_range","severity" }],
--   "responses": [{ "record_id","checklist_item_id","is_checked",
--               "measurement_value","notes","photo_url" }],
--   "parts": [{ "execution_id","part_name","part_code","quantity","cost" }]
-- }

CREATE OR REPLACE FUNCTION public.complete_maintenance_record(payload jsonb)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_record_id uuid := (payload->>'record_id')::uuid;
  v_update jsonb := coalesce(payload->'update', '{}'::jsonb);
BEGIN
  IF v_record_id IS NULL THEN
    RAISE EXCEPTION 'record_id ausente no payload';
  END IF;

  UPDATE public.maintenance_records SET
    status = 'completed',
    completed_at = now(),
    notes = CASE WHEN v_update ? 'notes' THEN v_update->>'notes' ELSE notes END,
    total_cost = coalesce((v_update->>'total_cost')::numeric, 0),
    downtime_minutes = coalesce((v_update->>'downtime_minutes')::integer, 0),
    signature_url = CASE WHEN v_update ? 'signature' THEN v_update->>'signature' ELSE signature_url END,
    checklist_version = CASE WHEN v_update ? 'checklist_version' THEN (v_update->>'checklist_version')::integer ELSE checklist_version END,
    checklist_snapshot = CASE WHEN v_update ? 'checklist_snapshot' THEN v_update->'checklist_snapshot' ELSE checklist_snapshot END,
    technical_sheet_id = CASE WHEN v_update ? 'technical_sheet_id' THEN nullif(v_update->>'technical_sheet_id', '')::uuid ELSE technical_sheet_id END,
    technical_sheet_version = CASE WHEN v_update ? 'technical_sheet_version' THEN (v_update->>'technical_sheet_version')::integer ELSE technical_sheet_version END,
    adjustment_parameters = CASE WHEN v_update ? 'adjustment_parameters' THEN v_update->'adjustment_parameters' ELSE adjustment_parameters END
  -- status <> 'approved': um registro já aprovado não pode voltar a
  -- 'completed' nem ter os dados sobrescritos por esta RPC.
  WHERE id = v_record_id AND status <> 'approved';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registro de manutenção não encontrado ou já aprovado.';
  END IF;

  INSERT INTO public.tpm_execution_alerts
    (execution_id, alert_type, parameter_name, expected_range, actual_value, severity, description, evidence_urls)
  SELECT
    v_record_id,
    a->>'alert_type',
    a->>'parameter_name',
    a->>'expected_range',
    a->>'actual_value',
    coalesce(a->>'severity', 'warning'),
    a->>'description',
    CASE WHEN a ? 'evidence_urls' AND jsonb_typeof(a->'evidence_urls') = 'array'
         THEN ARRAY(SELECT jsonb_array_elements_text(a->'evidence_urls'))
         ELSE '{}'::text[] END
  FROM jsonb_array_elements(coalesce(payload->'execution_alerts', '[]'::jsonb)) AS a;

  INSERT INTO public.tpm_execution_supplies
    (execution_id, name, quantity, alternative_used, original_recommended_id)
  SELECT
    v_record_id,
    s->>'name',
    s->>'quantity',
    coalesce(nullif(s->>'alternative_used', '')::boolean, false),
    nullif(s->>'original_recommended_id', '') -- coluna é TEXT: ids textuais quebrariam ::uuid
  FROM jsonb_array_elements(coalesce(payload->'supplies', '[]'::jsonb)) AS s;

  INSERT INTO public.tpm_parameter_alerts
    (execution_id, parameter_name, recorded_value, recommended_range, severity)
  SELECT
    v_record_id,
    p->>'parameter_name',
    p->>'recorded_value',
    p->>'recommended_range',
    coalesce(p->>'severity', 'warning')
  FROM jsonb_array_elements(coalesce(payload->'parameter_alerts', '[]'::jsonb)) AS p;

  INSERT INTO public.maintenance_item_responses
    (record_id, checklist_item_id, is_checked, measurement_value, notes, photo_url)
  SELECT
    v_record_id,
    nullif(r->>'checklist_item_id', '')::uuid,
    nullif(r->>'is_checked', '')::boolean,
    nullif(r->>'measurement_value', '')::numeric,
    r->>'notes',
    r->>'photo_url'
  FROM jsonb_array_elements(coalesce(payload->'responses', '[]'::jsonb)) AS r;

  INSERT INTO public.tpm_execution_parts
    (execution_id, part_name, part_code, quantity, cost)
  SELECT
    v_record_id,
    p->>'part_name',
    p->>'part_code',
    coalesce(nullif(p->>'quantity', '')::numeric, 1),
    nullif(p->>'cost', '')::numeric
  FROM jsonb_array_elements(coalesce(payload->'parts', '[]'::jsonb)) AS p;
END;
$$;
