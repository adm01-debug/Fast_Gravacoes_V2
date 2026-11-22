CREATE OR REPLACE FUNCTION public.save_tpm_checklist_snapshot()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    checklist_data JSONB;
BEGIN
    -- Se o snapshot já existir, não sobrescrevemos para manter a versão original da execução
    IF NEW.checklist_snapshot IS NULL THEN
        SELECT jsonb_agg(items) INTO checklist_data
        FROM (
            SELECT description, is_critical, requires_photo, requires_measurement, measurement_unit, min_value, max_value
            FROM public.maintenance_checklist_items
            WHERE checklist_id = (
                SELECT id FROM public.maintenance_checklists 
                WHERE maintenance_type_id = NEW.maintenance_type_id 
                LIMIT 1
            )
            ORDER BY item_order
        ) items;
        
        NEW.checklist_snapshot = checklist_data;
    END IF;
    RETURN NEW;
END;
$function$
