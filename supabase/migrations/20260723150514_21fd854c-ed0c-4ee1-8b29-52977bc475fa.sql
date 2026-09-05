
-- 1) Modelo global de itens
CREATE TABLE IF NOT EXISTS public.packaging_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN NOT NULL DEFAULT true,
  item_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.packaging_checklist_items TO authenticated;
GRANT ALL ON public.packaging_checklist_items TO service_role;

ALTER TABLE public.packaging_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checklist_items_read"
  ON public.packaging_checklist_items FOR SELECT
  TO authenticated USING (public.has_any_active_role());

CREATE POLICY "checklist_items_manage"
  ON public.packaging_checklist_items FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager'));

CREATE TRIGGER trg_pkg_checklist_items_updated_at
  BEFORE UPDATE ON public.packaging_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Preenchimento por tarefa
CREATE TABLE IF NOT EXISTS public.packaging_task_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  packaging_task_id UUID NOT NULL REFERENCES public.packaging_tasks(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.packaging_checklist_items(id) ON DELETE CASCADE,
  is_checked BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  checked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (packaging_task_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_pkg_task_checklist_task ON public.packaging_task_checklist(packaging_task_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.packaging_task_checklist TO authenticated;
GRANT ALL ON public.packaging_task_checklist TO service_role;

ALTER TABLE public.packaging_task_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pkg_task_checklist_read"
  ON public.packaging_task_checklist FOR SELECT
  TO authenticated USING (public.has_any_active_role());

CREATE POLICY "pkg_task_checklist_write"
  ON public.packaging_task_checklist FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'coordinator')
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'operator')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'coordinator')
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'operator')
  );

CREATE TRIGGER trg_pkg_task_checklist_updated_at
  BEFORE UPDATE ON public.packaging_task_checklist
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Guard: só liberar ready_to_ship se todos os itens obrigatórios estiverem marcados
CREATE OR REPLACE FUNCTION public.enforce_packaging_checklist_before_ship()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_missing INTEGER;
  v_required INTEGER;
BEGIN
  IF NEW.status = 'ready_to_ship' AND OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT COUNT(*) INTO v_required
    FROM public.packaging_checklist_items
    WHERE is_active = true AND is_required = true;

    IF v_required = 0 THEN
      RETURN NEW;
    END IF;

    SELECT COUNT(*) INTO v_missing
    FROM public.packaging_checklist_items ci
    LEFT JOIN public.packaging_task_checklist tc
      ON tc.item_id = ci.id AND tc.packaging_task_id = NEW.id
    WHERE ci.is_active = true
      AND ci.is_required = true
      AND (tc.is_checked IS NULL OR tc.is_checked = false);

    IF v_missing > 0 THEN
      RAISE EXCEPTION 'Existem % item(ns) obrigatório(s) do checklist de conferência ainda não marcados. Conclua o checklist antes de liberar para envio.', v_missing
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_pkg_checklist ON public.packaging_tasks;
CREATE TRIGGER trg_enforce_pkg_checklist
  BEFORE UPDATE ON public.packaging_tasks
  FOR EACH ROW EXECUTE FUNCTION public.enforce_packaging_checklist_before_ship();

-- 4) Seed inicial de itens padrão (só se a tabela estiver vazia)
INSERT INTO public.packaging_checklist_items (label, description, is_required, item_order)
SELECT * FROM (VALUES
  ('Quantidade conferida', 'Bater quantidade aprovada com o pedido original', true, 10),
  ('Personalização revisada', 'Conferir cor, alinhamento e legibilidade da personalização', true, 20),
  ('Embalagem íntegra', 'Verificar caixa/saco sem danos, lacres e etiquetas corretas', true, 30),
  ('Etiqueta de expedição', 'Etiqueta impressa e afixada corretamente', true, 40),
  ('Nota fiscal / romaneio', 'Documentos anexados quando aplicável', false, 50)
) AS v(label, description, is_required, item_order)
WHERE NOT EXISTS (SELECT 1 FROM public.packaging_checklist_items);
