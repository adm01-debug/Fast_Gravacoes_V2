CREATE OR REPLACE FUNCTION public.validate_inventory_stock()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
