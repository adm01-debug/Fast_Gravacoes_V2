-- Tabelas internas que os crons já escrevem mas nunca foram criadas:
-- cron-cleanup arquiva jobs, backup-scheduler registra execuções e
-- metrics-collector persiste métricas — todos falhavam em silêncio.

-- Cópia estrutural de jobs (sem FKs — linhas arquivadas podem perder
-- os pais). INSERT ... SELECT * funciona por posição de coluna.
CREATE TABLE IF NOT EXISTS public.archived_jobs (
  LIKE public.jobs INCLUDING ALL
);
ALTER TABLE public.archived_jobs
  ADD COLUMN IF NOT EXISTS archived_at timestamptz NOT NULL DEFAULT now(),
  -- Linhas filhas preservadas como jsonb por nome de tabela —
  -- deletar o job cascateia/anula os filhos, então o histórico
  -- (leituras QR, perdas, status) vai junto no arquivamento.
  ADD COLUMN IF NOT EXISTS children jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.backup_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_id text NOT NULL,
  tables_backed_up jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.system_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collected_at timestamptz NOT NULL DEFAULT now(),
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.archived_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;

-- Leitura operacional para gestão; escrita só via service role (crons).
-- app_private.has_role: public.has_role teve EXECUTE revogado de
-- authenticated na migração de 2026-06-19.
DROP POLICY IF EXISTS "Managers and admins can read archived jobs" ON public.archived_jobs;
CREATE POLICY "Managers and admins can read archived jobs"
  ON public.archived_jobs FOR SELECT
  USING (app_private.has_role(auth.uid(), 'manager'::public.app_role)
      OR app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Managers and admins can read backup logs" ON public.backup_logs;
CREATE POLICY "Managers and admins can read backup logs"
  ON public.backup_logs FOR SELECT
  USING (app_private.has_role(auth.uid(), 'manager'::public.app_role)
      OR app_private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Managers and admins can read system metrics" ON public.system_metrics;
CREATE POLICY "Managers and admins can read system metrics"
  ON public.system_metrics FOR SELECT
  USING (app_private.has_role(auth.uid(), 'manager'::public.app_role)
      OR app_private.has_role(auth.uid(), 'admin'::public.app_role));
