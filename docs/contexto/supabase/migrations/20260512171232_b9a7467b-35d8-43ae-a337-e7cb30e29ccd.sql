-- Create an enum for skill levels if it doesn't exist
DO $$ BEGIN
    CREATE TYPE public.skill_level AS ENUM ('basic', 'advanced', 'expert');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$

-- Create operator_skills table
CREATE TABLE IF NOT EXISTS public.operator_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    technique_id TEXT NOT NULL,
    skill_level skill_level NOT NULL DEFAULT 'basic',
    certified_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(operator_id, technique_id)
)

-- Enable RLS
ALTER TABLE public.operator_skills ENABLE ROW LEVEL SECURITY

-- Policies
CREATE POLICY "Everyone can view operator skills"
ON public.operator_skills FOR SELECT
USING (true)

CREATE POLICY "Coordinators can manage operator skills"
ON public.operator_skills FOR ALL
USING (public.has_role(auth.uid(), 'coordinator'))

-- Trigger for updated_at
CREATE TRIGGER update_operator_skills_updated_at
BEFORE UPDATE ON public.operator_skills
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column()
