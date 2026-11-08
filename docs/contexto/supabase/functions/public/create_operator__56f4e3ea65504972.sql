CREATE OR REPLACE FUNCTION public.create_operator(_email text, _password text, _full_name text, _phone text DEFAULT NULL::text, _role text DEFAULT 'operator'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'auth'
AS $function$
DECLARE
  _user_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role,
    email, encrypted_password,
    email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    _user_id,
    'authenticated',
    'authenticated',
    _email,
    crypt(_password, extensions.gen_salt('bf', 10)),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', _full_name, 'phone', _phone, 'role', _role),
    now(), now(),
    '', '', '', ''
  );

  IF _role <> 'operator' THEN
    UPDATE public.user_roles SET role = _role::public.app_role
      WHERE user_id = _user_id;
  END IF;

  RETURN _user_id;
END;
$function$
