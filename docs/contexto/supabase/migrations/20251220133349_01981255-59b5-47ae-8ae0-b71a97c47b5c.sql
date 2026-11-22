-- Create daily_summaries table
CREATE TABLE IF NOT EXISTS public.daily_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  summary_type TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Create unique constraint for date + summary_type
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_summaries_date_type ON public.daily_summaries(date, summary_type)

-- Enable RLS
ALTER TABLE public.daily_summaries ENABLE ROW LEVEL SECURITY

-- Policy: Anyone can view summaries
CREATE POLICY "Anyone can view summaries" 
ON public.daily_summaries 
FOR SELECT 
USING (true)

-- Policy: System can manage summaries
CREATE POLICY "System can manage summaries" 
ON public.daily_summaries 
FOR ALL 
USING (true)
WITH CHECK (true)
