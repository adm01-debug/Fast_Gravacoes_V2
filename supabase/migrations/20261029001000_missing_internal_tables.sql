-- Tabelas internas que os crons já escrevem mas nunca foram criadas:
-- cron-cleanup arquiva jobs, backup-scheduler registra execuções e
-- metrics-collector persiste métricas — todos falhavam em silêncio.

-- Cópia estrutural de jobs (sem FKs — linhas arquivadas podem perder
-- os pais). INSERT ... SELECT * funciona por posição de coluna.
CREATE TABLE IF NOT EXISTS public.archived_jobs (
  LIKE public.jobs INCLUDING ALL
);
ALTER TABLE public.archived_jobs
  ADD COLUMN IF NOT EXISTS archived_at timestamptz NOT NULL DEFAULT now();

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
CREATE POLICY "Managers and admins can read archived jobs"
  ON public.archived_jobs FOR SELECT
  USING (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers and admins can read backup logs"
  ON public.backup_logs FOR SELECT
  USING (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers and admins can read system metrics"
  ON public.system_metrics FOR SELECT
  USING (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin'));
