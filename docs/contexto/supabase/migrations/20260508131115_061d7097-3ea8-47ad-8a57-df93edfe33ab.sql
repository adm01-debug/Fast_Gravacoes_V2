-- Adicionar coluna de versão/snapshot do checklist em maintenance_records
ALTER TABLE public.maintenance_records 
ADD COLUMN IF NOT EXISTS checklist_snapshot JSONB

COMMENT ON COLUMN public.maintenance_records.checklist_snapshot IS 'Cópia fiel do checklist no momento em que a manutenção foi iniciada/concluída.'

-- Adicionar tipo de máquina ou categoria em maintenance_checklists para modelos
ALTER TABLE public.maintenance_checklists 
ADD COLUMN IF NOT EXISTS machine_category TEXT

-- Trigger para salvar o snapshot do checklist quando o status mudar para 'completed' ou 'approved'
CREATE OR REPLACE FUNCTION public.save_tpm_checklist_snapshot()
RETURNS TRIGGER AS $$
DECLARE
    checklist_data JSONB;
BEGIN
    -- Se o snapshot já existir, não sobrescrevemos para manter a versão original da execução
    IF NEW.checklist_snapshot IS NULL THEN
        SELECT jsonb_agg(items) INTO checklist_data
        FROM (
            SELECT description, is_critical, requires_photo, requires_measurement, measurement_unit, min_value, max_value
            FROM public.maintenance_checklist_items
            WHERE checklist_id = (
                SELECT id FROM public.maintenance_checklists 
                WHERE maintenance_type_id = NEW.maintenance_type_id 
                LIMIT 1
            )
            ORDER BY item_order
        ) items;
        
        NEW.checklist_snapshot = checklist_data;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql

CREATE TRIGGER trigger_save_checklist_snapshot
BEFORE UPDATE ON public.maintenance_records
FOR EACH ROW
WHEN (OLD.status = 'in_progress' AND NEW.status IN ('completed', 'approved'))
EXECUTE FUNCTION public.save_tpm_checklist_snapshot()
