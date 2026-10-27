-- Correções da rodada de validação pós-merge (agentes especializados, 2026-10-19):
-- 1) handle_new_user: provisão não pode abortar o signup inteiro quando falha
-- 2) trigger_send_tpm_email: EXCEPTION WHEN OTHERS no net.http_post (irmãs já têm)
-- 3) complete_maintenance_record: idempotente + não zera campos omitidos
-- 4) rollup-cron-p95-daily: agenda DIÁRIA real (era '20 * * * *' = de hora em hora)
-- 5) geo_blocking_settings: singleton (UI lê só a 1ª linha)
-- 6) policies criadas após 20260619160053 que ainda chamam public.has_role são
--    reescritas para app_private.has_role — em um rebuild limpo, a revogação de
--    EXECUTE executa e elas quebrariam com permission denied. (Produção só
--    funciona porque 20260619160053 foi marcada applied via repair sem executar.)

-- 1) handle_new_user — cada etapa de provisão isolada; falha vira WARNING e
--    o INSERT em auth.users segue (perfil/role podem ser recriados depois).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: falha ao criar profile de % (%)', NEW.id, SQLERRM;
  END;

  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'operator');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: falha ao criar role de % (%)', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- 2) trigger_send_tpm_email — mesmo corpo de 20261008160000, com o BEGIN/
--    EXCEPTION que as funções irmãs (notify_loss_risk, trigger_auto_promotion)
--    já tinham: se pg_net falhar, o INSERT em maintenance_alerts não aborta.
CREATE OR REPLACE FUNCTION public.trigger_send_tpm_email()
RETURNS TRIGGER AS $$
DECLARE
  v_base_url text := app_private.runtime_config_get('functions_base_url');
BEGIN
  IF coalesce(v_base_url, '') = '' THEN
    RAISE WARNING 'runtime_config.functions_base_url não configurado — webhook TPM ignorado neste ambiente';
    RETURN NEW;
  END IF;
  BEGIN
    PERFORM
      net.http_post(
        url := v_base_url || '/send-tpm-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', coalesce(app_private.runtime_config_get('cron_secret'), ''),
          'Authorization', 'Bearer ' || coalesce(app_private.runtime_config_get('service_role_key'), '')
        ),
        body := jsonb_build_object(
          'event_type', 'INSERT',
          'record', row_to_json(NEW)
        )::jsonb
      );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'trigger_send_tpm_email: falha ao notificar (%)', SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3) complete_maintenance_record — idempotente: um registro já 'completed'
--    não pode ser reconcluído (retry/double-submit re-executaria os 5 INSERTs
--    auxiliares e duplicaria alerts/supplies/parts/responses). E campos
--    omitidos no update não são mais zerados pelo coalesce.
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
    total_cost = CASE WHEN v_update ? 'total_cost' THEN coalesce((v_update->>'total_cost')::numeric, 0) ELSE total_cost END,
    downtime_minutes = CASE WHEN v_update ? 'downtime_minutes' THEN coalesce((v_update->>'downtime_minutes')::integer, 0) ELSE downtime_minutes END,
    signature_url = CASE WHEN v_update ? 'signature' THEN v_update->>'signature' ELSE signature_url END,
    checklist_version = CASE WHEN v_update ? 'checklist_version' THEN (v_update->>'checklist_version')::integer ELSE checklist_version END,
    checklist_snapshot = CASE WHEN v_update ? 'checklist_snapshot' THEN v_update->'checklist_snapshot' ELSE checklist_snapshot END,
    technical_sheet_id = CASE WHEN v_update ? 'technical_sheet_id' THEN nullif(v_update->>'technical_sheet_id', '')::uuid ELSE technical_sheet_id END,
    technical_sheet_version = CASE WHEN v_update ? 'technical_sheet_version' THEN (v_update->>'technical_sheet_version')::integer ELSE technical_sheet_version END,
    adjustment_parameters = CASE WHEN v_update ? 'adjustment_parameters' THEN v_update->'adjustment_parameters' ELSE adjustment_parameters END
  -- status NOT IN ('approved','completed'): aprovado é terminal e um
  -- registro já concluído não pode ser reconcluído (senão os INSERTs
  -- auxiliares abaixo duplicam).
  WHERE id = v_record_id AND status NOT IN ('approved', 'completed');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registro de manutenção não encontrado, já concluído ou já aprovado.';
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

REVOKE EXECUTE ON FUNCTION public.complete_maintenance_record(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_maintenance_record(jsonb) TO authenticated, service_role;

-- 4) rollup-cron-p95-daily — o nome e o RUNBOOK dizem "daily" mas a agenda era
--    '20 * * * *' (a cada hora no minuto 20). Reagenda para 03:20 diário.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'rollup-cron-p95-daily') THEN
      PERFORM cron.unschedule('rollup-cron-p95-daily');
    END IF;
    PERFORM cron.schedule(
      'rollup-cron-p95-daily',
      '20 3 * * *',
      $$SELECT public.rollup_cron_p95_daily(2);$$
    );
  END IF;
END $$;

-- 5) geo_blocking_settings — a UI assume linha única de configuração.
-- Dedupe ANTES do índice único: se a tabela já tiver linhas duplicadas,
-- CREATE UNIQUE INDEX falha e reverte a migration inteira. Mantém a linha
-- mais recentemente alterada (updated_at DESC; id só desempata de forma
-- determinística — uuid é aleatório e não ordena por recência).
DELETE FROM public.geo_blocking_settings a
 WHERE EXISTS (
   SELECT 1 FROM public.geo_blocking_settings b
    WHERE (b.updated_at, b.id) > (a.updated_at, a.id)
 );

CREATE UNIQUE INDEX IF NOT EXISTS geo_blocking_settings_singleton
  ON public.geo_blocking_settings ((true));

ALTER TABLE public.geo_blocking_settings
  DROP CONSTRAINT IF EXISTS geo_blocking_settings_mode_chk;
ALTER TABLE public.geo_blocking_settings
  ADD CONSTRAINT geo_blocking_settings_mode_chk CHECK (mode IN ('blocklist', 'allowlist'));

-- 6) Reescreve policies que ainda referenciam public.has_role para
--    app_private.has_role (mesmo loop de 20260619160053 — cobre as criadas
--    depois dela, que nunca foram reescritas porque ela foi repair-marked).
DO $$
DECLARE
  policy_record RECORD;
  optimized_using TEXT;
  optimized_check TEXT;
BEGIN
  FOR policy_record IN
    SELECT
      n.nspname AS schema_name,
      c.relname AS table_name,
      p.polname AS policy_name,
      pg_get_expr(p.polqual, p.polrelid) AS using_expr,
      pg_get_expr(p.polwithcheck, p.polrelid) AS check_expr
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND (
        pg_get_expr(p.polqual, p.polrelid) LIKE '%has_role(%'
        OR pg_get_expr(p.polwithcheck, p.polrelid) LIKE '%has_role(%'
      )
    ORDER BY n.nspname, c.relname, p.polname
  LOOP
    IF policy_record.using_expr IS NOT NULL THEN
      -- Um único regexp_replace com borda de identificador: converte
      -- 'public.has_role(' e 'has_role(' solto para 'app_private.has_role(',
      -- sem tocar em 'app_private.has_role(' já existente (o '.' antes de
      -- has_role impede o match). O antigo replace() encadeado corrompia
      -- expressões já migradas: 'app_private.has_role(' continha 'has_role('
      -- e virava 'app_private.app_private.has_role(' — quebrando o ALTER.
      optimized_using := regexp_replace(
        policy_record.using_expr,
        '(^|[^a-zA-Z0-9_.])(public\.)?has_role\(',
        '\1app_private.has_role(',
        'g'
      );

      EXECUTE format(
        'ALTER POLICY %I ON %I.%I USING (%s)',
        policy_record.policy_name,
        policy_record.schema_name,
        policy_record.table_name,
        optimized_using
      );
    END IF;

    IF policy_record.check_expr IS NOT NULL THEN
      optimized_check := regexp_replace(
        policy_record.check_expr,
        '(^|[^a-zA-Z0-9_.])(public\.)?has_role\(',
        '\1app_private.has_role(',
        'g'
      );

      EXECUTE format(
        'ALTER POLICY %I ON %I.%I WITH CHECK (%s)',
        policy_record.policy_name,
        policy_record.schema_name,
        policy_record.table_name,
        optimized_check
      );
    END IF;
  END LOOP;
END $$;
