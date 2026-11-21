-- Corrige os triggers de auditoria de status de jobs, que quebravam QUALQUER
-- UPDATE em public.jobs (incluindo a auto-promocao de buffer do F-009).
--
-- Problema: as migrations 20260516172507 (log_job_status_change) e
-- 20260516174623 (audit_job_status_change) inserem em public.audit_log usando
-- as colunas inexistentes old_values/new_values. A tabela audit_log so tem
-- old_data/new_data. Alem disso, action='status_change' viola a constraint
-- audit_log_action_check (so aceita INSERT/UPDATE/DELETE). Em UPDATE de status,
-- o primeiro trigger a falhar abortava a transacao inteira com 42703, portanto
-- nenhum update de status persistia: a promocao automatica de buffers nunca
-- funcionou, e mover cartao no Kanban/Finalizar job tambem quebrava.
--
-- Redesenho (revisao Devin): o trigger generico audit_jobs (audit_trigger_func,
-- migration 20260421004919) JA grava TODO UPDATE em audit_log com hash em cadeia
-- e old_data/new_data. Gravar aqui de novo duplicaria a auditoria (3 registros
-- para a mesma transicao) e quebraria a cadeia de hash. Entao:
--   * audit_job_status_change (trigger tr_audit_job_status) volta a gravar o
--     historico em public.job_status_history (tabela consumida pelo frontend
--     useJobStatusHistory / JobTraceabilityTab) - trabalho original do agente
--     da migration 20260512175348.
--   * log_job_status_change (trigger trigger_log_job_status_change) mantem a
--     notificacao push para admins/managers (trabalho do agente da migration
--     20260516172507), removendo o INSERT duplicado em audit_log e corrigindo
--     NEW.code -> NEW.order_number (jobs nao tem coluna code).

-- 1. audit_job_status_change (trigger tr_audit_job_status)
CREATE OR REPLACE FUNCTION public.audit_job_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.job_status_history (job_id, previous_status, new_status, changed_by)
        VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_audit_job_status ON public.jobs;
CREATE TRIGGER tr_audit_job_status
AFTER UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.audit_job_status_change();

-- 2. log_job_status_change (trigger trigger_log_job_status_change)
CREATE OR REPLACE FUNCTION public.log_job_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    actor_id UUID;
BEGIN
    actor_id := auth.uid();

    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.push_notifications (
            user_id,
            title,
            body,
            status,
            data
        )
        SELECT
            p.user_id,
            'Status de Job Alterado',
            format('O job %s (%s) mudou de %s para %s', NEW.order_number, NEW.client, OLD.status, NEW.status),
            'pending',
            jsonb_build_object(
                'type', 'job_status_update',
                'job_id', NEW.id,
                'old_status', OLD.status,
                'new_status', NEW.status,
                'severity', 'info',
                'actor_id', actor_id
            )
        FROM public.user_roles p
        WHERE p.role IN ('admin', 'manager');
    END IF;
    RETURN NEW;
END;
$$;

-- Revoga acesso publico por seguranca (padrao das migrations de fix).
REVOKE EXECUTE ON FUNCTION public.audit_job_status_change() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.log_job_status_change() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.audit_job_status_change() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.log_job_status_change() TO authenticated, service_role;

-- 3. Hash para registros sem actor (promocoes automaticas via service_role).
--    calculate_audit_hash (migration 20260512180411) concatena actor_id::text
--    sem COALESCE: com auth.uid() NULL, o || devolve NULL e o hash gravado vira
--    NULL -- registro invisivel na trilha (o schema do frontend exige hash
--    string) e conta como quebra de cadeia. COALESCE nao altera hashes de
--    registros com actor preenchido (comportamento identico) e passa a gerar
--    hash para promocoes automaticas, cujo resultado se mostra na tela.
CREATE OR REPLACE FUNCTION public.calculate_audit_hash(rec public.audit_log)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN md5(
    COALESCE(rec.previous_hash, '') ||
    rec.entity_type ||
    rec.entity_id ||
    rec.action ||
    COALESCE(rec.actor_id::text, '') ||
    COALESCE(rec.old_data::text, '') ||
    COALESCE(rec.new_data::text, '') ||
    rec.created_at::text
  );
END;
$$;
