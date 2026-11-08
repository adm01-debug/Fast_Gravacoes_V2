-- Create operator_achievements table for gamification
CREATE TABLE public.operator_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operator_id UUID NOT NULL,
  achievement_type TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'trophy',
  points INTEGER NOT NULL DEFAULT 0,
  achieved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  period_start DATE,
  period_end DATE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Create operator_rankings table
CREATE TABLE public.operator_rankings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operator_id UUID NOT NULL,
  ranking_type TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  position INTEGER NOT NULL,
  total_points INTEGER NOT NULL DEFAULT 0,
  total_produced INTEGER NOT NULL DEFAULT 0,
  efficiency_rate NUMERIC DEFAULT 0,
  quality_rate NUMERIC DEFAULT 0,
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(operator_id, ranking_type, period_start, period_end)
)

-- Create gamification_settings table
CREATE TABLE public.gamification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Enable RLS
ALTER TABLE public.operator_achievements ENABLE ROW LEVEL SECURITY

ALTER TABLE public.operator_rankings ENABLE ROW LEVEL SECURITY

ALTER TABLE public.gamification_settings ENABLE ROW LEVEL SECURITY

-- RLS Policies for operator_achievements
CREATE POLICY "Anyone can view achievements"
  ON public.operator_achievements FOR SELECT
  USING (true)

CREATE POLICY "System can manage achievements"
  ON public.operator_achievements FOR ALL
  USING (true)
  WITH CHECK (true)

-- RLS Policies for operator_rankings
CREATE POLICY "Anyone can view rankings"
  ON public.operator_rankings FOR SELECT
  USING (true)

CREATE POLICY "System can manage rankings"
  ON public.operator_rankings FOR ALL
  USING (true)
  WITH CHECK (true)

-- RLS Policies for gamification_settings
CREATE POLICY "Anyone can view gamification settings"
  ON public.gamification_settings FOR SELECT
  USING (true)

CREATE POLICY "Coordinators can manage gamification settings"
  ON public.gamification_settings FOR ALL
  USING (has_role(auth.uid(), 'coordinator'))
  WITH CHECK (has_role(auth.uid(), 'coordinator'))

-- Insert default achievement types
INSERT INTO public.gamification_settings (setting_key, setting_value, description) VALUES
('achievement_types', '["production_master", "quality_champion", "efficiency_star", "consistency_king", "speed_demon", "zero_defects", "early_bird", "team_player"]', 'Available achievement types'),
('points_config', '{"production_piece": 1, "efficiency_bonus": 50, "quality_bonus": 100, "streak_bonus": 25}', 'Points configuration'),
('ranking_periods', '["daily", "weekly", "monthly"]', 'Available ranking periods')

-- Add trigger for updated_at
CREATE TRIGGER update_gamification_settings_updated_at
  BEFORE UPDATE ON public.gamification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column()
