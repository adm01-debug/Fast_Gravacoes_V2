CREATE OR REPLACE FUNCTION public.check_tpm_schedules_notifications()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Esta função seria chamada por um cron job a cada X horas
    -- Ela verificaria schedules atrasados ou prestes a vencer e inseriria alertas
    -- que por sua vez disparariam as notificações via hooks/functions
END;
$function$
