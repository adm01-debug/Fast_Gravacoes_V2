CREATE OR REPLACE FUNCTION public.validate_packaging_loss_reason()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.received_quantity > 0
     AND NEW.rejected_quantity IS NOT NULL
     AND NEW.rejected_quantity::numeric / NEW.received_quantity::numeric > 0.05
     AND (NEW.loss_reason IS NULL OR trim(NEW.loss_reason) = '')
  THEN
    RAISE EXCEPTION 'loss_reason é obrigatório quando rejeição supera 5%% da quantidade recebida';
  END IF;
  RETURN NEW;
END;
$function$
