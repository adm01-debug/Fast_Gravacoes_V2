-- Corrige os triggers de auditoria de status de jobs, que quebravam QUALQUER
-- UPDATE em public.jobs (incluindo a auto-promocao de buffer do F-009).
--
-- Problema: as migrations 20260516172507 (log_job_status_change) e
-- 20260516174623 (audit_job_status_change) inserem em public.audit_log usando
-- as colunas inexistentes old_values/new_values. A tabela audit_log so tem
-- old_data/new_data. Alem disso, action='status_change' viola a constraint
-- audit_log_action_check (so aceita INSERT/UPDATE/DELETE/CREATE). Em UPDATE
-- de status, o primeiro trigger a falhar abortava a transacao inteira com
-- 42703, portanto nenhum update de status persistia: a promocao automatica de
-- buffers nunca funcionou, e mover cartao no Kanban/Finalizar job tambem
-- quebrava silenciosamente (a menos que o chamador tratasse o 400).
--
-- Correcao: alinha os INSERTs ao schema real (old_data/new_data) e usa
-- action='UPDATE'. Tambem corrige log_job_status_change, que referenciava
-- NEW.code (coluna inexistente; jobs tem order_number). A notificacao push
-- para admins/managers e o registro em audit_log sao preservados.

-- 1. audit_job_status_change (trigger tr_audit_job_status)
CREATE OR REPLACE FUNCTION public.audit_job_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.audit_log (
            entity_type,
            entity_id,
            action,
            actor_id,
            old_data,
            new_data,
            changed_fields,
            metadata
        ) VALUES (
            'job',
            NEW.id,
            'UPDATE',
            auth.uid(),
            jsonb_build_object('status', OLD.status),
            jsonb_build_object('status', NEW.status),
            ARRAY['status'],
            jsonb_build_object('order_number', NEW.order_number)
        );
    END IF;
    RETURN NEW;
END;
$$;

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
        INSERT INTO public.audit_log (
            entity_type,
            entity_id,
            action,
            actor_id,
            old_data,
            new_data,
            changed_fields,
            metadata
        ) VALUES (
            'job',
            NEW.id,
            'UPDATE',
            actor_id,
            jsonb_build_object('status', OLD.status),
            jsonb_build_object('status', NEW.status),
            ARRAY['status'],
            jsonb_build_object(
                'order_number', NEW.order_number,
                'client', NEW.client,
                'product', NEW.product
            )
        );

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
                'severity', 'info'
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
