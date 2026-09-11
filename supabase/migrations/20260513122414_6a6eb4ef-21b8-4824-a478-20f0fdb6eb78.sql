-- 1. Corrigir search_path das funções de auditoria
ALTER FUNCTION public.calculate_audit_hash(public.audit_log) SET search_path = public, extensions;
ALTER FUNCTION public.process_audit_log_hashing() SET search_path = public, extensions;

-- 2. Atualizar a constraint do audit_log para aceitar 'CREATE' (usado pelo trigger log_role_changes)
ALTER TABLE public.audit_log DROP CONSTRAINT IF EXISTS audit_log_action_check;
ALTER TABLE public.audit_log ADD CONSTRAINT audit_log_action_check CHECK (action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text, 'CREATE'::text]));

-- 3. Garantir que o usuário principal tenha o papel de coordinator
DO $$
BEGIN
    -- Este UUID é um usuário legado, não um principal criado por migrations.
    -- Em banco limpo ele não existe em auth.users; pular o seed evita violar a
    -- FK e preserva a atualização nos ambientes em que o usuário existe.
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = '82a51685-324b-4db1-9b27-a96590bf267a') THEN
      IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = '82a51685-324b-4db1-9b27-a96590bf267a') THEN
          UPDATE public.user_roles SET role = 'coordinator' WHERE user_id = '82a51685-324b-4db1-9b27-a96590bf267a';
      ELSE
          INSERT INTO public.user_roles (user_id, role) VALUES ('82a51685-324b-4db1-9b27-a96590bf267a', 'coordinator');
      END IF;
    END IF;
END $$;
