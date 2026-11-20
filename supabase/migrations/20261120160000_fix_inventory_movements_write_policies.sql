-- Fix: inventory_movements sem escrita — INSERT/DELETE bloqueados por RLS.
--
-- Contexto:
--   A tabela só tinha policy de SELECT ("Active roles can view inventory movements").
--   O front (useInventory.ts) grava movimentações direto via PostgREST:
--     - recordMovement: INSERT com user_id = auth.uid()
--     - transferItems:  INSERT bulk (TRANSFER)
--     - deleteMovement: DELETE (rollback de estoque via trigger tr_rollback_inventory_stock)
--   Sem policy INSERT/DELETE, o PostgREST nega a escrita com "new row violates
--   row-level security policy" — movimentação de estoque não grava no banco.
--
-- Correção:
--   INSERT: role ativa + user_id do próprio usuário (WITH CHECK).
--   DELETE: role ativa + só a própria movimentação (o trigger de rollback
--   restaura o estoque; ADJUST não tem rollback automático — documentado).

DROP POLICY IF EXISTS "Active roles can insert inventory movements"
  ON public.inventory_movements;

CREATE POLICY "Active roles can insert inventory movements"
  ON public.inventory_movements
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_any_active_role()
    AND user_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "Active roles can delete own inventory movements"
  ON public.inventory_movements;

CREATE POLICY "Active roles can delete own inventory movements"
  ON public.inventory_movements
  FOR DELETE TO authenticated
  USING (
    public.has_any_active_role()
    AND user_id = (select auth.uid())
  );
-- Alinha permissoes do rollback de estoque: o trigger roda como INVOKER e,
-- para um usuario com apenas role 'operator' (que pode DELETAR a movimentacao),
-- o UPDATE em inventory_items e barrado por RLS (policy "Inventory items managed
-- by managers/coordinators") -> o DELETE remove o historico sem restaurar o saldo.
-- update_inventory_stock (INSERT) ja e SECURITY DEFINER; rollback passa a ser igual.
CREATE OR REPLACE FUNCTION public.rollback_inventory_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.type = 'IN') THEN
        UPDATE public.inventory_items
        SET current_stock = current_stock - OLD.quantity,
            updated_at = now()
        WHERE id = OLD.item_id;
    ELSIF (OLD.type = 'OUT') THEN
        UPDATE public.inventory_items
        SET current_stock = current_stock + OLD.quantity,
            updated_at = now()
        WHERE id = OLD.item_id;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;