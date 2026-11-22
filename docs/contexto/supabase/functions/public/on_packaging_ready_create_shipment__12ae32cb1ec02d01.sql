CREATE OR REPLACE FUNCTION public.on_packaging_ready_create_shipment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_exists BOOLEAN;
  v_client TEXT;
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'ready_to_ship') THEN
    -- Evitar duplicidade: só cria se o job ainda não tem shipment
    SELECT EXISTS(SELECT 1 FROM public.shipments WHERE job_id = NEW.job_id) INTO v_exists;
    IF NOT v_exists THEN
      SELECT client INTO v_client FROM public.jobs WHERE id = NEW.job_id;
      INSERT INTO public.shipments (job_id, status, destination, notes)
      VALUES (
        NEW.job_id,
        'pending',
        v_client,
        'Criado automaticamente após conclusão do manuseio e embalagem'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
