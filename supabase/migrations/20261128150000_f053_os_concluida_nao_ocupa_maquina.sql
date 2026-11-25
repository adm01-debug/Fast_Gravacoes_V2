-- Etapa 053 (RN-08): OS concluida deixa de ocupar o horario da maquina.
--
-- Problema: public.check_job_overlap recusava sobreposicao com QUALQUER OS que
-- nao estivesse cancelada -- `AND status != 'cancelled'` na contagem e o retorno
-- antecipado para NEW.status = 'cancelled'. Uma OS finalizada continuava
-- reservando o horario para sempre, e reprogramar a mesma maquina no horario de
-- um trabalho ja terminado era recusado pelo banco.
--
-- Decisao do dono (25/11/2026): trabalho concluido nao ocupa mais a maquina.
--
-- Mudanca: apenas a lista de status. Deixam de ocupar o horario `cancelled` e
-- `finished`; todo o resto continua ocupando (inclusive `packaging`, que existe
-- no enum do banco e ainda nao no aplicativo). E a mesma lista que a etapa 052
-- centralizou em MACHINE_BLOCKING_STATUSES (src/constants/index.ts).
--
-- Um ponto da clausula de status que precisou acompanhar: o portao que evita
-- revalidar UPDATE que nao mexe no agendamento comparava apenas a entrada e a
-- saida de `cancelled`. Ele agora compara a entrada e a saida do conjunto que
-- ocupa o horario (`cancelled` + `finished`). Sem isso, reabrir uma OS
-- finalizada (finished -> production) no mesmo horario passaria sem validacao e
-- dois trabalhos ficariam sobrepostos em silencio.
--
-- Nada mais mudou: maquina, data, horarios, a mensagem de erro em portugues e os
-- GRANTs seguem iguais aos da migration 20261118100000.

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
    -- Update que nao altera o agendamento nem o estado que ocupa o horario nao
    -- pode ser barrado por um conflito que ja existia antes dele.
    IF TG_OP = 'UPDATE'
       AND NEW.machine_id IS NOT DISTINCT FROM OLD.machine_id
       AND NEW.scheduled_date IS NOT DISTINCT FROM OLD.scheduled_date
       AND NEW.start_time IS NOT DISTINCT FROM OLD.start_time
       AND NEW.end_time IS NOT DISTINCT FROM OLD.end_time
       AND (NEW.status IN ('cancelled', 'finished')) IS NOT DISTINCT FROM (OLD.status IN ('cancelled', 'finished')) THEN
        RETURN NEW;
    END IF;

    -- Only check for jobs with machine, date, and times assigned
    IF NEW.machine_id IS NULL OR NEW.scheduled_date IS NULL OR NEW.start_time IS NULL OR NEW.end_time IS NULL THEN
        RETURN NEW;
    END IF;

    -- Skip check if the job itself does not occupy the machine slot
    IF NEW.status IN ('cancelled', 'finished') THEN
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
      AND status NOT IN ('cancelled', 'finished')
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