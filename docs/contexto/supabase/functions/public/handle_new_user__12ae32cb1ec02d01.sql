CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: falha ao criar profile de % (%)', NEW.id, SQLERRM;
  END;

  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'operator');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: falha ao criar role de % (%)', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$function$
