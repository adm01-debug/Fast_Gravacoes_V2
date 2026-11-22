-- Create report_templates table
CREATE TABLE public.report_templates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    table_name TEXT NOT NULL,
    columns TEXT[] NOT NULL,
    filters JSONB DEFAULT '{}'::jsonb,
    format_type TEXT DEFAULT 'pdf',
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Enable RLS
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY

-- Create policies
CREATE POLICY "Users can view their own templates" 
ON public.report_templates 
FOR SELECT 
USING (auth.uid() = user_id OR is_public = true)

CREATE POLICY "Users can create their own templates" 
ON public.report_templates 
FOR INSERT 
WITH CHECK (auth.uid() = user_id)

CREATE POLICY "Users can update their own templates" 
ON public.report_templates 
FOR UPDATE 
USING (auth.uid() = user_id)

CREATE POLICY "Users can delete their own templates" 
ON public.report_templates 
FOR DELETE 
USING (auth.uid() = user_id)

-- Create trigger for updated_at
CREATE TRIGGER update_report_templates_updated_at
BEFORE UPDATE ON public.report_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column()
