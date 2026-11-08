-- 1. Definir search_path em funções críticas para segurança (Correção WARN 1 Linter)
DO $$ 
DECLARE 
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT n.nspname as schema, p.proname as function_name, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
    LOOP
        EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public', 
                       func_record.schema, func_record.function_name, func_record.args);
    END LOOP;
END $$

-- 2. Corrigir RLS permissivo (WARN 2 Linter)
-- Verificar tabelas com USING(true) em operações de escrita e restringir para auth.uid()
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles

CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true)

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles

CREATE POLICY "Users can update their own profile" ON public.profiles 
FOR UPDATE USING (auth.uid() = id)

-- 3. Restringir SECURITY DEFINER (WARN 3-10 Linter)
-- Revogar EXECUTE de anon para funções SECURITY DEFINER no schema public
DO $$ 
DECLARE 
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT n.nspname as schema, p.proname as function_name, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.prosecdef = true AND n.nspname = 'public'
    LOOP
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM anon', 
                       func_record.schema, func_record.function_name, func_record.args);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated', 
                       func_record.schema, func_record.function_name, func_record.args);
    END LOOP;
END $$

-- 4. Constraints de Integridade de Dados
ALTER TABLE public.jobs ADD CONSTRAINT quantity_non_negative CHECK (quantity >= 0)

ALTER TABLE public.jobs ADD CONSTRAINT produced_quantity_non_negative CHECK (produced_quantity >= 0)

ALTER TABLE public.jobs ADD CONSTRAINT lost_pieces_non_negative CHECK (lost_pieces >= 0)

ALTER TABLE public.inventory_items ADD CONSTRAINT stock_non_negative CHECK (current_stock >= 0)

-- 5. Trigger de Auditoria de Erros Críticos
CREATE OR REPLACE FUNCTION public.log_security_violation()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.security_events (event_type, description, metadata)
    VALUES ('RLS_VIOLATION', 'Tentativa de operação não autorizada na tabela ' || TG_TABLE_NAME, 
            jsonb_build_object('user_id', auth.uid(), 'operation', TG_OP));
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
