-- Função para rollback de estoque ao deletar movimentação
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
    -- ADJUST não tem rollback automático óbvio pois mudou para um valor absoluto
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SET search_path = public

-- Gatilho para deletar
DROP TRIGGER IF EXISTS tr_rollback_inventory_stock ON public.inventory_movements

CREATE TRIGGER tr_rollback_inventory_stock
BEFORE DELETE ON public.inventory_movements
FOR EACH ROW EXECUTE FUNCTION public.rollback_inventory_stock()
