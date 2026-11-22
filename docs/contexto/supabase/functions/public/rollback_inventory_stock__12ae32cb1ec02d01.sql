CREATE OR REPLACE FUNCTION public.rollback_inventory_stock()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
