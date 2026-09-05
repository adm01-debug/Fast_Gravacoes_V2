
-- Trigger: quando uma packaging_task fica 'ready_to_ship', criar shipment pendente automaticamente
CREATE OR REPLACE FUNCTION public.on_packaging_ready_create_shipment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

DROP TRIGGER IF EXISTS trg_packaging_ready_create_shipment ON public.packaging_tasks;
CREATE TRIGGER trg_packaging_ready_create_shipment
AFTER UPDATE ON public.packaging_tasks
FOR EACH ROW
EXECUTE FUNCTION public.on_packaging_ready_create_shipment();
