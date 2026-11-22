-- Table for user notification preferences
CREATE TABLE IF NOT EXISTS public.user_notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email_enabled BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT true,
    whatsapp_enabled BOOLEAN DEFAULT false,
    whatsapp_number TEXT,
    notification_types TEXT[] DEFAULT ARRAY['upcoming', 'due', 'overdue', 'critical'],
    machine_filters UUID[] DEFAULT ARRAY[]::UUID[], -- Empty means all machines
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id)
)

-- Enable RLS
ALTER TABLE public.user_notification_settings ENABLE ROW LEVEL SECURITY

-- Policies
CREATE POLICY "Users can view their own settings"
    ON public.user_notification_settings FOR SELECT
    USING (auth.uid() = user_id)

CREATE POLICY "Users can update their own settings"
    ON public.user_notification_settings FOR UPDATE
    USING (auth.uid() = user_id)

CREATE POLICY "Users can insert their own settings"
    ON public.user_notification_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id)

-- Trigger for updated_at
CREATE TRIGGER update_user_notification_settings_updated_at
    BEFORE UPDATE ON public.user_notification_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column()
