ALTER TABLE public.packaging_tasks
  ADD COLUMN IF NOT EXISTS delay_reason TEXT,
  ADD COLUMN IF NOT EXISTS delay_category TEXT,
  ADD COLUMN IF NOT EXISTS was_overdue_on_complete BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_packaging_tasks_delay_category
  ON public.packaging_tasks (delay_category)
  WHERE delay_category IS NOT NULL;