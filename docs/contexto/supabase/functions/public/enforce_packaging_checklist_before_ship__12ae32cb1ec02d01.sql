CREATE OR REPLACE FUNCTION public.enforce_packaging_checklist_before_ship()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
