-- Corrige o trigger de conflito de agendamento, que travava jobs permanentemente.
--
-- Problema: trigger_check_job_overlap e BEFORE INSERT OR UPDATE sem clausula OF,
-- e check_job_overlap() nunca comparava OLD com NEW. Consequencia: QUALQUER
-- update em um job cujo horario ja colidia com outro re-disparava o
-- RAISE EXCEPTION, e o PostgREST devolvia 400. O job ficava imutavel: nao dava
-- para mover no Kanban, registrar producao, finalizar nem marcar atraso.
-- Em producao isso aparecia sozinho, sem acao do usuario, porque
-- src/hooks/useSmartDelayAlerts.ts faz .update({ status: 'delayed' }) ao carregar
-- o dashboard.
--
-- Correcao: em UPDATE, so revalidar quando algo relevante para o conflito mudou
-- (maquina, data, horarios) ou quando o job entra/sai do estado 'cancelled'
-- (descancelar um job faz ele voltar a disputar o horario). Updates que nao
-- tocam o agendamento passam direto.
--
-- A protecao contra conflitos NOVOS continua integral: INSERT e qualquer
-- reagendamento seguem validados exatamente como antes.
--
-- O SET search_path = public replica o que a migration 20260512213123 aplicou
-- via ALTER FUNCTION; sem ele, o CREATE OR REPLACE apagaria essa configuracao.

CREATE OR REPLACE FUNCTION public.check_job_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    overlap_count INTEGER;
    machine_name TEXT;
BEGIN
    -- Update que nao altera o agendamento nem o estado de cancelamento nao pode
    -- ser barrado por um conflito que ja existia antes dele.
    IF TG_OP = 'UPDATE'
       AND NEW.machine_id IS NOT DISTINCT FROM OLD.machine_id
       AND NEW.scheduled_date IS NOT DISTINCT FROM OLD.scheduled_date
       AND NEW.start_time IS NOT DISTINCT FROM OLD.start_time
       AND NEW.end_time IS NOT DISTINCT FROM OLD.end_time
       AND (NEW.status = 'cancelled') IS NOT DISTINCT FROM (OLD.status = 'cancelled') THEN
        RETURN NEW;
    END IF;

    -- Only check for jobs with machine, date, and times assigned
    IF NEW.machine_id IS NULL OR NEW.scheduled_date IS NULL OR NEW.start_time IS NULL OR NEW.end_time IS NULL THEN
        RETURN NEW;
    END IF;

    -- Skip check if status is 'cancelled'
    IF NEW.status = 'cancelled' THEN
        RETURN NEW;
    END IF;

    -- Check for overlaps
    -- Assuming start_time and end_time are in 'HH:mm' format (text comparison works)
    SELECT COUNT(*)
    INTO overlap_count
    FROM public.jobs
    WHERE machine_id = NEW.machine_id
      AND scheduled_date = NEW.scheduled_date
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND status != 'cancelled'
      AND (
        (NEW.start_time < end_time AND NEW.end_time > start_time)
      );

    IF overlap_count > 0 THEN
        -- Try to get machine name for better error message
        SELECT name INTO machine_name FROM public.machines WHERE id = NEW.machine_id;
        RAISE EXCEPTION 'Conflito de agendamento: A maquina % ja possui um job agendado entre % e % nesta data.',
            COALESCE(machine_name, NEW.machine_id::text),
            NEW.start_time,
            NEW.end_time;
    END IF;

    RETURN NEW;
END;
$$;

-- Os GRANTs da migration 20260514211713 sobrevivem ao CREATE OR REPLACE
-- (o objeto nao e recriado), mas reafirmamos para que esta migration seja
-- autossuficiente se aplicada em um banco novo.
REVOKE EXECUTE ON FUNCTION public.check_job_overlap() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_job_overlap() TO authenticated, service_role;
