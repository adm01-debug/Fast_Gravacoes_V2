
CREATE TABLE public.packaging_sla_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technique_id TEXT NULL REFERENCES public.techniques(id) ON DELETE CASCADE,
  client TEXT NULL,
  sla_triage_hours NUMERIC NOT NULL DEFAULT 4,
  sla_packaging_hours NUMERIC NOT NULL DEFAULT 8,
  sla_total_hours NUMERIC NOT NULL DEFAULT 24,
  warning_threshold_pct NUMERIC NOT NULL DEFAULT 75,
  notes TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT packaging_sla_overrides_scope_check CHECK (technique_id IS NOT NULL OR client IS NOT NULL)
);

CREATE UNIQUE INDEX packaging_sla_overrides_scope_uidx
  ON public.packaging_sla_overrides (COALESCE(technique_id, ''), COALESCE(lower(client), ''));

CREATE INDEX packaging_sla_overrides_technique_idx ON public.packaging_sla_overrides (technique_id);
CREATE INDEX packaging_sla_overrides_client_idx ON public.packaging_sla_overrides (lower(client));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.packaging_sla_overrides TO authenticated;
GRANT ALL ON public.packaging_sla_overrides TO service_role;

ALTER TABLE public.packaging_sla_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "packaging_sla_overrides_select_authenticated"
  ON public.packaging_sla_overrides FOR SELECT TO authenticated
  USING (public.has_any_active_role());

CREATE POLICY "packaging_sla_overrides_insert_coord"
  ON public.packaging_sla_overrides FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "packaging_sla_overrides_update_coord"
  ON public.packaging_sla_overrides FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "packaging_sla_overrides_delete_coord"
  ON public.packaging_sla_overrides FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager'));

CREATE TRIGGER trg_packaging_sla_overrides_updated_at
  BEFORE UPDATE ON public.packaging_sla_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
