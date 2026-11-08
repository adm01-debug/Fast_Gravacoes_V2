-- Table for customizable notification templates
CREATE TABLE IF NOT EXISTS public.tpm_notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp', 'push')),
    severity TEXT NOT NULL CHECK (severity IN ('upcoming', 'due', 'overdue', 'critical')),
    subject TEXT, -- For email only
    template_body TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
)

-- Table for notification logs (Audit)
CREATE TABLE IF NOT EXISTS public.tpm_notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID REFERENCES public.machines(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    channel TEXT NOT NULL,
    severity TEXT NOT NULL,
    recipient TEXT,
    status TEXT NOT NULL CHECK (status IN ('success', 'failure')),
    error_message TEXT,
    payload JSONB,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT now()
)

-- Table for severity configurations per machine
CREATE TABLE IF NOT EXISTS public.tpm_severity_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID REFERENCES public.machines(id) ON DELETE CASCADE,
    severity TEXT NOT NULL CHECK (severity IN ('upcoming', 'due', 'overdue', 'critical')),
    days_threshold INTEGER DEFAULT 0, -- e.g., 5 days before for 'upcoming'
    message_override TEXT,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(machine_id, severity)
)

-- Enable RLS
ALTER TABLE public.tpm_notification_templates ENABLE ROW LEVEL SECURITY

ALTER TABLE public.tpm_notification_logs ENABLE ROW LEVEL SECURITY

ALTER TABLE public.tpm_severity_configs ENABLE ROW LEVEL SECURITY

-- RLS Policies
CREATE POLICY "Templates viewable by authenticated users" ON public.tpm_notification_templates FOR SELECT TO authenticated USING (true)

CREATE POLICY "Templates editable by admins" ON public.tpm_notification_templates FOR ALL TO authenticated USING (true)

-- Simplifying for now

CREATE POLICY "Logs viewable by authenticated users" ON public.tpm_notification_logs FOR SELECT TO authenticated USING (true)

CREATE POLICY "Logs insertable by system" ON public.tpm_notification_logs FOR INSERT TO authenticated WITH CHECK (true)

CREATE POLICY "Severity configs viewable by authenticated users" ON public.tpm_severity_configs FOR SELECT TO authenticated USING (true)

CREATE POLICY "Severity configs editable by authenticated users" ON public.tpm_severity_configs FOR ALL TO authenticated USING (true)

-- Insert default templates
INSERT INTO public.tpm_notification_templates (channel, severity, subject, template_body) VALUES
('email', 'upcoming', 'Manutenção Próxima: {{machine_name}}', 'Olá, a máquina {{machine_name}} ({{machine_code}}) possui uma manutenção agendada para daqui a {{days}} dias ({{due_date}}).'),
('email', 'due', 'Manutenção Vencendo Hoje: {{machine_name}}', 'Atenção: A manutenção da máquina {{machine_name}} vence hoje!'),
('email', 'overdue', 'ALERTA: Manutenção Atrasada {{machine_name}}', 'A manutenção da máquina {{machine_name}} está atrasada em {{days}} dias. Por favor, regularize imediatamente.'),
('email', 'critical', 'URGENTE: Falha Crítica/Manutenção {{machine_name}}', 'Alerta crítico para a máquina {{machine_name}}: {{message}}'),
('whatsapp', 'upcoming', NULL, '📅 *Manutenção Próxima*\nMáquina: {{machine_name}}\nData: {{due_date}}\nFaltam {{days}} dias.'),
('whatsapp', 'due', NULL, '⚠️ *Vencendo Hoje*\nA manutenção da máquina {{machine_name}} vence hoje!'),
('whatsapp', 'overdue', NULL, '🔴 *Atrasada*\nMáquina {{machine_name}} com {{days}} dias de atraso.'),
('whatsapp', 'critical', NULL, '🚨 *ALERTA CRÍTICO*\n{{machine_name}}: {{message}}')
