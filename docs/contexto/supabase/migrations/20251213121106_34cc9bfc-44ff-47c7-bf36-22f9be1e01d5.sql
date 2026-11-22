-- Create table for technical assistant conversations
CREATE TABLE public.technical_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Nova conversa',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Create table for conversation messages
CREATE TABLE public.technical_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.technical_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Enable RLS
ALTER TABLE public.technical_conversations ENABLE ROW LEVEL SECURITY

ALTER TABLE public.technical_messages ENABLE ROW LEVEL SECURITY

-- Policies for conversations
CREATE POLICY "Users can view their own conversations" 
ON public.technical_conversations 
FOR SELECT 
USING (auth.uid() = user_id)

CREATE POLICY "Users can create their own conversations" 
ON public.technical_conversations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id)

CREATE POLICY "Users can update their own conversations" 
ON public.technical_conversations 
FOR UPDATE 
USING (auth.uid() = user_id)

CREATE POLICY "Users can delete their own conversations" 
ON public.technical_conversations 
FOR DELETE 
USING (auth.uid() = user_id)

-- Policies for messages (inherit from conversation ownership)
CREATE POLICY "Users can view messages from their conversations" 
ON public.technical_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.technical_conversations 
    WHERE id = conversation_id AND user_id = auth.uid()
  )
)

CREATE POLICY "Users can insert messages to their conversations" 
ON public.technical_messages 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.technical_conversations 
    WHERE id = conversation_id AND user_id = auth.uid()
  )
)

-- Trigger for updated_at
CREATE TRIGGER update_technical_conversations_updated_at
BEFORE UPDATE ON public.technical_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column()

-- Create index for faster queries
CREATE INDEX idx_technical_messages_conversation ON public.technical_messages(conversation_id)

CREATE INDEX idx_technical_conversations_user ON public.technical_conversations(user_id)
