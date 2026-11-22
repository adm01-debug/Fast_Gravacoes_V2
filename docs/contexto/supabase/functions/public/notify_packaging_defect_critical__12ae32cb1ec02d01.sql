CREATE OR REPLACE FUNCTION public.notify_packaging_defect_critical()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_task RECORD;
  v_order TEXT;
  v_client TEXT;
BEGIN
  IF NEW.severity NOT IN ('critical', 'high') AND NEW.decision <> 'rework' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_task FROM public.packaging_tasks WHERE id = NEW.packaging_task_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  SELECT order_number, client INTO v_order, v_client
    FROM public.jobs WHERE id = v_task.job_id;

  INSERT INTO public.push_notifications (user_id, title, body, status, data)
  SELECT DISTINCT ur.user_id,
         CASE WHEN NEW.decision = 'rework'
              THEN 'Retrabalho gerado pela embalagem'
              ELSE 'Defeito crítico na triagem' END,
         format('Pedido %s (%s) · %s · %s peça(s) · severidade: %s',
                COALESCE(v_order, '—'), COALESCE(v_client, '—'),
                NEW.defect_type, NEW.quantity, NEW.severity),
         'pending',
         jsonb_build_object(
           'type', 'packaging_defect',
           'task_id', NEW.packaging_task_id,
           'defect_id', NEW.id,
           'decision', NEW.decision,
           'severity', NEW.severity,
           'route', '/packaging?task=' || NEW.packaging_task_id::text,
           'severity_ui', CASE WHEN NEW.severity = 'critical' THEN 'critical' ELSE 'warning' END
         )
  FROM public.user_roles ur
  WHERE ur.role IN ('coordinator', 'manager')
    AND ur.is_active = true;

  RETURN NEW;
END;
$function$
