-- =============================================================================
-- Migration: Regras de Negócio DDL
-- R1.2: cancel_reason em jobs + trigger de validação
-- R1.4: ao cancelar job, colocar packaging_tasks em on_hold
-- R2.3: pg_cron auto-reassign tarefas de embalagem ociosas (>30 min)
-- R3.3: REVOKE EXECUTE de RPCs com dados sensíveis para anon
-- R5.1: limite de peso por pacote (máx 30 kg/pacote)
-- R5.2: limite de packages_count por tarefa (máx 500)
-- R5.3: loss_reason em packaging_tasks + trigger (>5% rejeição)
-- R5.4: profundidade máx de cadeia rework = 2 níveis
-- =============================================================================

-- -------------------------------------------------------------------------
-- R1.2: Coluna cancel_reason em jobs + trigger de validação
-- -------------------------------------------------------------------------
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

CREATE OR REPLACE FUNCTION public.validate_job_cancel_reason()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'cancelled' AND (NEW.cancel_reason IS NULL OR trim(NEW.cancel_reason) = '') THEN
    RAISE EXCEPTION 'cancel_reason é obrigatório ao cancelar um job';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_job_cancel_reason ON public.jobs;
CREATE TRIGGER trg_validate_job_cancel_reason
  BEFORE INSERT OR UPDATE OF status, cancel_reason ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.validate_job_cancel_reason();

-- -------------------------------------------------------------------------
-- R1.4: Ao cancelar job, colocar packaging_tasks relacionadas em on_hold
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.on_job_cancelled_hold_packaging()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
    UPDATE public.packaging_tasks
    SET status = 'on_hold', updated_at = now()
    WHERE job_id = NEW.id
      AND status NOT IN ('ready_to_ship');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_job_cancelled_hold_packaging ON public.jobs;
CREATE TRIGGER trg_job_cancelled_hold_packaging
  AFTER UPDATE OF status ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.on_job_cancelled_hold_packaging();

-- -------------------------------------------------------------------------
-- R2.3: pg_cron auto-reassign de tarefas de embalagem ociosas (>30 min)
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auto_reassign_stale_packaging_tasks()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.packaging_tasks
  SET assigned_to = NULL, updated_at = now()
  WHERE status IN ('pending', 'in_triage')
    AND assigned_to IS NOT NULL
    AND updated_at < now() - interval '30 minutes';
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-reassign-packaging-30min') THEN
    PERFORM cron.schedule(
      'auto-reassign-packaging-30min',
      '*/5 * * * *',
      'SELECT public.auto_reassign_stale_packaging_tasks()'
    );
  END IF;
END;
$$;

-- -------------------------------------------------------------------------
-- R3.3: Revogar EXECUTE de RPCs com dados sensíveis para anon
-- -------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.get_packaging_manifest(uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_packaging_leaderboard() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_system_status_summary() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_cron_health() FROM anon;
REVOKE EXECUTE ON FUNCTION public.auto_reassign_stale_packaging_tasks() FROM anon;

-- -------------------------------------------------------------------------
-- R5.1: Limite de peso por pacote (máx 30 kg/pacote)
-- -------------------------------------------------------------------------
ALTER TABLE public.packaging_tasks
  DROP CONSTRAINT IF EXISTS packaging_tasks_weight_per_package_check;

ALTER TABLE public.packaging_tasks
  ADD CONSTRAINT packaging_tasks_weight_per_package_check
  CHECK (
    total_weight_kg IS NULL
    OR packages_count IS NULL
    OR packages_count = 0
    OR (total_weight_kg / packages_count) <= 30
  );

-- -------------------------------------------------------------------------
-- R5.2: Limite de pacotes por tarefa (máx 500)
-- -------------------------------------------------------------------------
ALTER TABLE public.packaging_tasks
  DROP CONSTRAINT IF EXISTS packaging_tasks_packages_count_check;

ALTER TABLE public.packaging_tasks
  ADD CONSTRAINT packaging_tasks_packages_count_check
  CHECK (packages_count IS NULL OR (packages_count >= 0 AND packages_count <= 500));

-- -------------------------------------------------------------------------
-- R5.3: Coluna loss_reason em packaging_tasks + trigger (>5% rejeição)
-- -------------------------------------------------------------------------
ALTER TABLE public.packaging_tasks
  ADD COLUMN IF NOT EXISTS loss_reason TEXT;

CREATE OR REPLACE FUNCTION public.validate_packaging_loss_reason()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.received_quantity > 0
     AND NEW.rejected_quantity IS NOT NULL
     AND NEW.rejected_quantity::numeric / NEW.received_quantity::numeric > 0.05
     AND (NEW.loss_reason IS NULL OR trim(NEW.loss_reason) = '')
  THEN
    RAISE EXCEPTION 'loss_reason é obrigatório quando rejeição supera 5%% da quantidade recebida';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_packaging_loss_reason ON public.packaging_tasks;
CREATE TRIGGER trg_validate_packaging_loss_reason
  BEFORE INSERT OR UPDATE OF rejected_quantity, received_quantity, loss_reason ON public.packaging_tasks
  FOR EACH ROW EXECUTE FUNCTION public.validate_packaging_loss_reason();

-- -------------------------------------------------------------------------
-- R5.4: Profundidade máxima de cadeia rework = 2 níveis
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_job_rework_depth()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  parent_parent_id UUID;
BEGIN
  IF NEW.parent_job_id IS NOT NULL THEN
    SELECT parent_job_id INTO parent_parent_id
    FROM public.jobs
    WHERE id = NEW.parent_job_id;
    IF parent_parent_id IS NOT NULL THEN
      RAISE EXCEPTION 'Cadeia de rework não pode ter mais de 2 níveis (pai já tem pai)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_job_rework_depth ON public.jobs;
CREATE TRIGGER trg_validate_job_rework_depth
  BEFORE INSERT OR UPDATE OF parent_job_id ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.validate_job_rework_depth();
