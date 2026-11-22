-- Adicionar campos de regulagem às fichas técnicas
ALTER TABLE public.technical_sheets 
ADD COLUMN IF NOT EXISTS machine_settings JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS ink_specifications TEXT,
ADD COLUMN IF NOT EXISTS tooling_specifications TEXT

-- Comentários para documentação
COMMENT ON COLUMN public.technical_sheets.machine_settings IS 'Armazena configurações técnicas da máquina (velocidade, pressão, temperatura, etc).'

COMMENT ON COLUMN public.technical_sheets.ink_specifications IS 'Especificações de tinta e solventes recomendados.'

COMMENT ON COLUMN public.technical_sheets.tooling_specifications IS 'Especificações de ferramentas (ex: dureza do rodo, tipo de lâmina).'
