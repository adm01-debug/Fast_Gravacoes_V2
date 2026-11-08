-- Criar tabela para armazenar dispositivos conhecidos do usuário
CREATE TABLE public.user_devices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  device_fingerprint text NOT NULL,
  ip_address inet,
  user_agent text,
  browser_name text,
  os_name text,
  device_type text DEFAULT 'desktop',
  city text,
  country text,
  is_trusted boolean NOT NULL DEFAULT false,
  first_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  last_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
)

-- Criar índice único para evitar duplicatas
CREATE UNIQUE INDEX user_devices_unique_fingerprint ON public.user_devices (user_id, device_fingerprint)

-- Criar índice para buscas rápidas
CREATE INDEX user_devices_user_id_idx ON public.user_devices (user_id)

-- Habilitar RLS
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY

-- Políticas RLS
CREATE POLICY "Users can view their own devices"
ON public.user_devices
FOR SELECT
USING (auth.uid() = user_id)

CREATE POLICY "System can insert devices"
ON public.user_devices
FOR INSERT
WITH CHECK (true)

CREATE POLICY "System can update devices"
ON public.user_devices
FOR UPDATE
USING (true)

CREATE POLICY "Users can delete their own devices"
ON public.user_devices
FOR DELETE
USING (auth.uid() = user_id)

-- Criar tabela para logs de alertas de dispositivo novo
CREATE TABLE public.new_device_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  device_id uuid REFERENCES public.user_devices(id),
  ip_address inet,
  user_agent text,
  email_sent boolean NOT NULL DEFAULT false,
  email_sent_at timestamp with time zone,
  acknowledged boolean NOT NULL DEFAULT false,
  acknowledged_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
)

-- Habilitar RLS
ALTER TABLE public.new_device_alerts ENABLE ROW LEVEL SECURITY

-- Políticas RLS
CREATE POLICY "Users can view their own alerts"
ON public.new_device_alerts
FOR SELECT
USING (auth.uid() = user_id)

CREATE POLICY "System can insert alerts"
ON public.new_device_alerts
FOR INSERT
WITH CHECK (true)

CREATE POLICY "System can update alerts"
ON public.new_device_alerts
FOR UPDATE
USING (true)
