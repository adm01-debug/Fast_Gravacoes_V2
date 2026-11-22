-- Chat messages table for quick communication between operators and coordinators
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'general',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Pre-production checklist items per job
CREATE TABLE public.pre_production_checklists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  checked_by UUID,
  checked_by_name TEXT,
  material_verified BOOLEAN NOT NULL DEFAULT false,
  color_verified BOOLEAN NOT NULL DEFAULT false,
  machine_clean BOOLEAN NOT NULL DEFAULT false,
  tools_ready BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY

ALTER TABLE public.pre_production_checklists ENABLE ROW LEVEL SECURITY

-- Chat policies
CREATE POLICY "Authenticated users can view chat messages" ON public.chat_messages FOR SELECT TO authenticated USING (true)

CREATE POLICY "Authenticated users can send chat messages" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id)

CREATE POLICY "Users can update own messages" ON public.chat_messages FOR UPDATE TO authenticated USING (auth.uid() = sender_id)

-- Checklist policies
CREATE POLICY "Anyone can view checklists" ON public.pre_production_checklists FOR SELECT TO authenticated USING (true)

CREATE POLICY "Authenticated users can manage checklists" ON public.pre_production_checklists FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL)

CREATE POLICY "Authenticated users can update checklists" ON public.pre_production_checklists FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL)

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages
