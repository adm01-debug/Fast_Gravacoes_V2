CREATE OR REPLACE FUNCTION public.notify_packaging_task_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order TEXT;
  v_client TEXT;
BEGIN
  SELECT order_number, client INTO v_order, v_client
    FROM public.jobs WHERE id = NEW.job_id;

  INSERT INTO public.push_notifications (user_id, title, body, status, data)
  SELECT DISTINCT ur.user_id,
         'Nova tarefa de embalagem',
         format('Pedido %s (%s) chegou ao setor de manuseio · %s peça(s)',
                COALESCE(v_order, '—'), COALESCE(v_client, '—'), COALESCE(NEW.received_quantity, 0)),
         'pending',
         jsonb_build_object(
           'type', 'packaging_task_created',
           'task_id', NEW.id,
           'job_id', NEW.job_id,
           'route', '/packaging?task=' || NEW.id::text,
           'severity', 'info'
         )
  FROM public.user_roles ur
  WHERE ur.role IN ('coordinator', 'manager')
    AND ur.is_active = true;

  RETURN NEW;
END;
$function$
