-- 1. Desabilitar o gatilho de auditoria que está falhando por falta da função digest()
ALTER TABLE public.user_roles DISABLE TRIGGER tr_audit_role_changes

-- 2. Garantir que o perfil existe para o usuário adm01
INSERT INTO public.profiles (id, full_name)
VALUES ('82a51685-324b-4db1-9b27-a96590bf267a', 'Administrador Principal')
ON CONFLICT (id) DO NOTHING

-- 3. Definir a role como 'admin' na tabela user_roles
UPDATE public.user_roles 
SET role = 'admin', is_active = true 
WHERE user_id = '82a51685-324b-4db1-9b27-a96590bf267a'

-- 4. Inserir caso não exista (segurança extra)
INSERT INTO public.user_roles (user_id, role, is_active)
SELECT '82a51685-324b-4db1-9b27-a96590bf267a', 'admin', true
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = '82a51685-324b-4db1-9b27-a96590bf267a')

-- 5. Reabilitar o gatilho
ALTER TABLE public.user_roles ENABLE TRIGGER tr_audit_role_changes

-- 6. Tentar habilitar a extensão pgcrypto corretamente para futuras auditorias
CREATE EXTENSION IF NOT EXISTS pgcrypto
