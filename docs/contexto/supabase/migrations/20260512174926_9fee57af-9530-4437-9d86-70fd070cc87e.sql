-- 1. Matrix de Competências Técnicas
CREATE TABLE IF NOT EXISTS public.operator_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    technique_id UUID NOT NULL REFERENCES public.techniques(id) ON DELETE CASCADE,
    skill_level TEXT NOT NULL CHECK (skill_level IN ('basic', 'advanced', 'expert')),
    certified_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    certified_by UUID REFERENCES auth.users(id),
    expires_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(operator_id, technique_id)
)

ALTER TABLE public.operator_skills ENABLE ROW LEVEL SECURITY

CREATE POLICY "Operator skills are viewable by everyone" 
ON public.operator_skills FOR SELECT USING (true)

CREATE POLICY "Authenticated users can manage skills" 
ON public.operator_skills FOR ALL 
USING (auth.role() = 'authenticated')

-- 2. Leaderboard e Performance Gamificada
CREATE TABLE IF NOT EXISTS public.operator_rankings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ranking_type TEXT NOT NULL CHECK (ranking_type IN ('daily', 'weekly', 'monthly')),
    position INTEGER,
    total_points INTEGER DEFAULT 0,
    total_produced INTEGER DEFAULT 0,
    efficiency_rate DECIMAL(5,2),
    quality_rate DECIMAL(5,2),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
)

ALTER TABLE public.operator_rankings ENABLE ROW LEVEL SECURITY

CREATE POLICY "Rankings are viewable by everyone" 
ON public.operator_rankings FOR SELECT USING (true)

-- 3. Auditoria Industrial de Status
CREATE TABLE IF NOT EXISTS public.operator_status_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    previous_data JSONB,
    new_data JSONB,
    changed_by UUID REFERENCES auth.users(id),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
)

ALTER TABLE public.operator_status_audit ENABLE ROW LEVEL SECURITY

CREATE POLICY "Audit logs viewable by authenticated users" 
ON public.operator_status_audit FOR SELECT 
USING (auth.role() = 'authenticated')

-- 4. Função para calcular ranking (Placeholder para lógica futura)
CREATE OR REPLACE FUNCTION public.refresh_operator_rankings(p_type TEXT)
RETURNS void AS $$
BEGIN
    -- Lógica para calcular e inserir/atualizar rankings baseada em logs de produção
END;
$$ LANGUAGE plpgsql

-- 5. Triggers para auditoria de status (monitorando full_name e avatar_url)
CREATE OR REPLACE FUNCTION public.audit_profile_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.full_name IS DISTINCT FROM NEW.full_name OR OLD.avatar_url IS DISTINCT FROM NEW.avatar_url THEN
        INSERT INTO public.operator_status_audit (operator_id, previous_data, new_data, changed_by, reason)
        VALUES (
            NEW.id, 
            jsonb_build_object('full_name', OLD.full_name, 'avatar_url', OLD.avatar_url),
            jsonb_build_object('full_name', NEW.full_name, 'avatar_url', NEW.avatar_url),
            auth.uid(), 
            'Profile update'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql

DROP TRIGGER IF EXISTS tr_audit_profile_change ON public.profiles

CREATE TRIGGER tr_audit_profile_change
AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.audit_profile_change()
