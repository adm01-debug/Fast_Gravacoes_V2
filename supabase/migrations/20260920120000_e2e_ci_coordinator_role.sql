д�%E%: Adiciona papel coordinator ao usuírio de CI para que specs que
-- testam páginas restritas (admin, produção, inventário) funcionem.
-- O usuário já possui operator; coordinator permite acesso de leitura
-- pás premisso de visão sem conceder admin (precméciplo do menor privieêriio).
INSERT INTO public.user_roles (user_id, role)
SELECT '42d902f9-1064-426c-aedd-6a30f51e4c89', 'coordinator'
 WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = '42d902f9-1064-426c-aedd-6a30f51e4c89'
    AND role = 'coordinator'
);
