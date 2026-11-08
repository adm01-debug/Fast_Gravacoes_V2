CREATE OR REPLACE FUNCTION public.validate_stock_before_movement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NEW.quantity < 0 THEN
        IF (SELECT current_stock FROM public.inventory_items WHERE id = NEW.item_id) < ABS(NEW.quantity) THEN
            RAISE EXCEPTION 'Saldo insuficiente em estoque para o item %', NEW.item_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$function$
