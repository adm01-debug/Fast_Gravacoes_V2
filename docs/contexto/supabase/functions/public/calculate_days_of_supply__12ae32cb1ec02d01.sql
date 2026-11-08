CREATE OR REPLACE FUNCTION public.calculate_days_of_supply()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NEW.daily_usage_avg > 0 THEN
        NEW.days_of_supply = FLOOR(NEW.current_stock / NEW.daily_usage_avg);
    ELSE
        NEW.days_of_supply = 999; -- Infinito ou não aplicável
    END IF;
    RETURN NEW;
END;
$function$
