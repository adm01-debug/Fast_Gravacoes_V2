ALTER TABLE public.techniques 
ADD COLUMN IF NOT EXISTS low_threshold INTEGER DEFAULT 300,
ADD COLUMN IF NOT EXISTS medium_threshold INTEGER DEFAULT 480,
ADD COLUMN IF NOT EXISTS high_threshold INTEGER DEFAULT 600

COMMENT ON COLUMN public.techniques.low_threshold IS 'Threshold em minutos para risco baixo de gargalo'

COMMENT ON COLUMN public.techniques.medium_threshold IS 'Threshold em minutos para risco médio de gargalo'

COMMENT ON COLUMN public.techniques.high_threshold IS 'Threshold em minutos para risco alto de gargalo'
