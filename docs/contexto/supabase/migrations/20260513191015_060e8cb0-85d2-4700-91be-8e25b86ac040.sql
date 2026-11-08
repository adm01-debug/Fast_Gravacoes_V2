CREATE OR REPLACE FUNCTION public.validate_inventory_stock()
RETURNS TRIGGER AS $$
DECLARE
    v_current_stock NUMERIC;
    v_item_name TEXT;
BEGIN
    IF (NEW.type = 'OUT') THEN
        SELECT current_stock, name INTO v_current_stock, v_item_name
        FROM public.inventory_items
        WHERE id = NEW.item_id;

        IF v_current_stock < NEW.quantity THEN
            RAISE EXCEPTION 'Estoque insuficiente para o item %: solicitado %, disponível %', v_item_name, NEW.quantity, v_current_stock;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public

-- Trigger de validação ANTES da inserção
CREATE TRIGGER tr_validate_inventory_stock
BEFORE INSERT ON public.inventory_movements
FOR EACH ROW
EXECUTE FUNCTION validate_inventory_stock()
