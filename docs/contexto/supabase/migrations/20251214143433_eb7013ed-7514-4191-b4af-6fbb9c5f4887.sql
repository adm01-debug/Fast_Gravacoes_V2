-- Create operator_goals table for tracking performance targets
CREATE TABLE public.operator_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operator_id UUID NOT NULL,
  goal_type TEXT NOT NULL, -- 'efficiency', 'jobs_completed', 'pieces_produced', 'loss_rate'
  target_value NUMERIC NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_period CHECK (period_end >= period_start),
  CONSTRAINT valid_goal_type CHECK (goal_type IN ('efficiency', 'jobs_completed', 'pieces_produced', 'loss_rate'))
)

-- Enable Row Level Security
ALTER TABLE public.operator_goals ENABLE ROW LEVEL SECURITY

-- Create policies
CREATE POLICY "Anyone can view operator goals" 
ON public.operator_goals 
FOR SELECT 
USING (true)

CREATE POLICY "Coordinators can manage operator goals" 
ON public.operator_goals 
FOR ALL 
USING (has_role(auth.uid(), 'coordinator'::app_role))
WITH CHECK (has_role(auth.uid(), 'coordinator'::app_role))

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_operator_goals_updated_at
BEFORE UPDATE ON public.operator_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column()

-- Create index for faster lookups
CREATE INDEX idx_operator_goals_operator_period ON public.operator_goals(operator_id, period_start, period_end)
