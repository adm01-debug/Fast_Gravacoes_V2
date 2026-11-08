CREATE OR REPLACE FUNCTION public.on_packaging_defect_create_rework_job()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_task RECORD;
  v_job RECORD;
  v_new_order_number TEXT;
  v_reason TEXT;
BEGIN
  IF NEW.decision <> 'rework' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_task FROM public.packaging_tasks WHERE id = NEW.packaging_task_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  SELECT * INTO v_job FROM public.jobs WHERE id = v_task.job_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  -- Evitar duplicidade: se já existe um job filho para esta task+defeito, não recria
  IF EXISTS (
    SELECT 1 FROM public.jobs
    WHERE parent_job_id = v_job.id
      AND rework_reason LIKE 'RETRABALHO-EMB:' || NEW.id::text || '%'
  ) THEN
    RETURN NEW;
  END IF;

  v_new_order_number := v_job.order_number || '-RW-' || substr(NEW.id::text, 1, 6);
  v_reason := 'RETRABALHO-EMB:' || NEW.id::text
    || ' | Defeito: ' || NEW.defect_type
    || ' | Severidade: ' || NEW.severity
    || COALESCE(' | Obs: ' || NEW.notes, '');

  INSERT INTO public.jobs (
    order_number, client, product, quantity, technique_id,
    machine_id, estimated_duration, status, priority,
    gravure_color, product_category_id, parent_job_id, rework_reason, notes
  ) VALUES (
    v_new_order_number,
    v_job.client,
    v_job.product,
    NEW.quantity,
    v_job.technique_id,
    v_job.machine_id,
    GREATEST(30, COALESCE(v_job.estimated_duration, 60) * NEW.quantity / NULLIF(v_job.quantity, 0)),
    'queue',
    'high',
    v_job.gravure_color,
    v_job.product_category_id,
    v_job.id,
    v_reason,
    'Gerado automaticamente pelo setor de Manuseio e Embalagem'
  );

  RETURN NEW;
END;
$function$
