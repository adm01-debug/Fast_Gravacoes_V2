CREATE OR REPLACE FUNCTION public.update_inventory_stock()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF (NEW.type = 'IN') THEN
        UPDATE public.inventory_items 
        SET current_stock = current_stock + NEW.quantity,
            updated_at = now()
        WHERE id = NEW.item_id;
    ELSIF (NEW.type = 'OUT') THEN
        UPDATE public.inventory_items 
        SET current_stock = current_stock - NEW.quantity,
            updated_at = now()
        WHERE id = NEW.item_id;
    ELSIF (NEW.type = 'ADJUST') THEN
        UPDATE public.inventory_items 
        SET current_stock = NEW.quantity, -- In ADJUST, we set the absolute value
            updated_at = now()
        WHERE id = NEW.item_id;
    END IF;
    RETURN NEW;
END;
$function$
