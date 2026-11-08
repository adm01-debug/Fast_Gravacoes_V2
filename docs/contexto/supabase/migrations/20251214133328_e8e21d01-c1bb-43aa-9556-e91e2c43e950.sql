-- Create user_favorites table to persist quick favorites
CREATE TABLE public.user_favorites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  favorites jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id)
)

-- Enable RLS
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY

-- Users can view their own favorites
CREATE POLICY "Users can view own favorites"
ON public.user_favorites
FOR SELECT
USING (auth.uid() = user_id)

-- Users can insert their own favorites
CREATE POLICY "Users can insert own favorites"
ON public.user_favorites
FOR INSERT
WITH CHECK (auth.uid() = user_id)

-- Users can update their own favorites
CREATE POLICY "Users can update own favorites"
ON public.user_favorites
FOR UPDATE
USING (auth.uid() = user_id)

-- Create trigger for updated_at
CREATE TRIGGER update_user_favorites_updated_at
BEFORE UPDATE ON public.user_favorites
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column()
