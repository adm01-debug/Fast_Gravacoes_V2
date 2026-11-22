-- Gamification Rewards table
CREATE TABLE public.gamification_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    cost_points INTEGER NOT NULL,
    icon TEXT DEFAULT 'star',
    color_class TEXT,
    stock INTEGER DEFAULT -1, -- -1 for infinite
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
)

-- Reward Redemptions table
CREATE TABLE public.reward_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    reward_id UUID REFERENCES public.gamification_rewards(id) NOT NULL,
    points_spent INTEGER NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, approved, delivered, cancelled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
)

-- Enable RLS
ALTER TABLE public.gamification_rewards ENABLE ROW LEVEL SECURITY

ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY

-- Policies
CREATE POLICY "Anyone can view active rewards" 
ON public.gamification_rewards FOR SELECT 
USING (is_active = true)

CREATE POLICY "Users can view their redemptions" 
ON public.reward_redemptions FOR SELECT 
USING (auth.uid() = user_id)

CREATE POLICY "Users can create redemptions" 
ON public.reward_redemptions FOR INSERT 
WITH CHECK (auth.uid() = user_id)

-- Insert Default Rewards
INSERT INTO public.gamification_rewards (name, description, cost_points, icon, color_class) VALUES 
('Folga de Meio Período', 'Ganhe 4 horas de folga remunerada mediante agendamento.', 2500, 'clock', 'bg-blue-500/10 text-blue-600'),
('Vale Presente R$ 50', 'Cartão presente para uso em parceiros locais.', 1500, 'package', 'bg-green-500/10 text-green-600'),
('Prioridade de Turno', 'Escolha seu turno preferencial por 1 semana inteira.', 3000, 'zap', 'bg-amber-500/10 text-amber-600'),
('Café com a Diretoria', 'Apresente suas ideias e feedbacks diretamente aos diretores.', 1000, 'star', 'bg-purple-500/10 text-purple-600'),
('Bônus de Produtividade', 'Crédito em folha no próximo fechamento mensal.', 5000, 'trending-up', 'bg-rose-500/10 text-rose-600')
