
-- ============================================================
-- 1) Ajustar CHECK constraint de jobs.status para incluir 'packaging'
-- ============================================================
DO $$
DECLARE
  con_name text;
BEGIN
  SELECT conname INTO con_name
  FROM pg_constraint
  WHERE conrelid = 'public.jobs'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%status%';
  IF con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.jobs DROP CONSTRAINT %I', con_name);
  END IF;
END $$;

ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_status_check
  CHECK (status IN ('queue','ready','scheduled','production','finished','paused','cancelled','delayed','rework','buffer','packaging'));

-- ============================================================
-- 2) packaging_tasks
-- ============================================================
CREATE TABLE public.packaging_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL UNIQUE REFERENCES public.jobs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','in_triage','packaging','ready_to_ship','on_hold')),
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  received_quantity INTEGER NOT NULL DEFAULT 0 CHECK (received_quantity >= 0),
  approved_quantity INTEGER NOT NULL DEFAULT 0 CHECK (approved_quantity >= 0),
  rejected_quantity INTEGER NOT NULL DEFAULT 0 CHECK (rejected_quantity >= 0),
  package_type TEXT,
  packages_count INTEGER CHECK (packages_count IS NULL OR packages_count >= 0),
  total_weight_kg NUMERIC(10,3) CHECK (total_weight_kg IS NULL OR total_weight_kg >= 0),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT packaging_tasks_qty_sum CHECK (approved_quantity + rejected_quantity <= received_quantity)
);

CREATE INDEX idx_packaging_tasks_status ON public.packaging_tasks(status);
CREATE INDEX idx_packaging_tasks_assigned_to ON public.packaging_tasks(assigned_to);
CREATE INDEX idx_packaging_tasks_created_at ON public.packaging_tasks(created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.packaging_tasks TO authenticated;
GRANT ALL ON public.packaging_tasks TO service_role;

ALTER TABLE public.packaging_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage all packaging tasks"
  ON public.packaging_tasks FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'coordinator')
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'coordinator')
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Operators view unassigned or own packaging tasks"
  ON public.packaging_tasks FOR SELECT
  TO authenticated
  USING (
    public.has_any_active_role()
    AND (assigned_to IS NULL OR assigned_to = auth.uid())
  );

CREATE POLICY "Operators update their own packaging tasks"
  ON public.packaging_tasks FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'operator')
    AND (assigned_to IS NULL OR assigned_to = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'operator')
    AND (assigned_to IS NULL OR assigned_to = auth.uid())
  );

CREATE TRIGGER trg_packaging_tasks_updated_at
  BEFORE UPDATE ON public.packaging_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 3) packaging_defects
-- ============================================================
CREATE TABLE public.packaging_defects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  packaging_task_id UUID NOT NULL REFERENCES public.packaging_tasks(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  defect_type TEXT NOT NULL
    CHECK (defect_type IN ('print_misalignment','color_deviation','scratch','contamination','wrong_material','dimensional','other')),
  severity TEXT NOT NULL DEFAULT 'minor'
    CHECK (severity IN ('minor','major','critical')),
  decision TEXT NOT NULL DEFAULT 'discard'
    CHECK (decision IN ('rework','discard','accept_with_note')),
  photo_url TEXT,
  reported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_packaging_defects_task ON public.packaging_defects(packaging_task_id);
CREATE INDEX idx_packaging_defects_created_at ON public.packaging_defects(created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.packaging_defects TO authenticated;
GRANT ALL ON public.packaging_defects TO service_role;

ALTER TABLE public.packaging_defects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage all defects"
  ON public.packaging_defects FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'coordinator')
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'coordinator')
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Operators view defects of accessible tasks"
  ON public.packaging_defects FOR SELECT
  TO authenticated
  USING (
    public.has_any_active_role()
    AND EXISTS (
      SELECT 1 FROM public.packaging_tasks t
      WHERE t.id = packaging_defects.packaging_task_id
        AND (t.assigned_to IS NULL OR t.assigned_to = auth.uid())
    )
  );

CREATE POLICY "Operators insert defects on their tasks"
  ON public.packaging_defects FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'operator')
    AND reported_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.packaging_tasks t
      WHERE t.id = packaging_task_id
        AND (t.assigned_to IS NULL OR t.assigned_to = auth.uid())
    )
  );

CREATE TRIGGER trg_packaging_defects_updated_at
  BEFORE UPDATE ON public.packaging_defects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 4) packaging_settings (singleton-ish config)
-- ============================================================
CREATE TABLE public.packaging_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_types TEXT[] NOT NULL DEFAULT ARRAY['caixa','saco','envelope','pallet']::TEXT[],
  defect_reasons TEXT[] NOT NULL DEFAULT ARRAY['print_misalignment','color_deviation','scratch','contamination','wrong_material','dimensional','other']::TEXT[],
  weight_unit TEXT NOT NULL DEFAULT 'kg' CHECK (weight_unit IN ('kg','g','lb')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.packaging_settings TO authenticated;
GRANT ALL ON public.packaging_settings TO service_role;

ALTER TABLE public.packaging_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All active users read settings"
  ON public.packaging_settings FOR SELECT
  TO authenticated
  USING (public.has_any_active_role());

CREATE POLICY "Staff manage settings"
  ON public.packaging_settings FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'coordinator')
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'coordinator')
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE TRIGGER trg_packaging_settings_updated_at
  BEFORE UPDATE ON public.packaging_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.packaging_settings DEFAULT VALUES;

-- ============================================================
-- 5) Trigger: auto-cria packaging_task ao finalizar job
-- ============================================================
CREATE OR REPLACE FUNCTION public.on_job_finished_create_packaging_task()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'finished') THEN
    INSERT INTO public.packaging_tasks (job_id, status, received_quantity)
    VALUES (
      NEW.id,
      'pending',
      COALESCE(NEW.produced_quantity, NEW.quantity, 0)
    )
    ON CONFLICT (job_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_job_finished_create_packaging_task ON public.jobs;
CREATE TRIGGER trg_on_job_finished_create_packaging_task
  AFTER UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.on_job_finished_create_packaging_task();

-- ============================================================
-- 6) Realtime
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.packaging_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.packaging_defects;
