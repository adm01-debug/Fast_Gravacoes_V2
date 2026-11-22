-- 1. Revogar execução pública de funções críticas SECURITY DEFINER
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC

REVOKE EXECUTE ON FUNCTION public.log_security_violation() FROM PUBLIC

REVOKE EXECUTE ON FUNCTION public.verify_audit_chain() FROM PUBLIC

REVOKE EXECUTE ON FUNCTION public.trigger_auto_promotion() FROM PUBLIC

-- 2. Adição de CHECK constraints para integridade de dados
ALTER TABLE public.jobs ADD CONSTRAINT jobs_quantity_positive CHECK (quantity >= 0)

ALTER TABLE public.production_losses ADD CONSTRAINT production_losses_quantity_positive CHECK (quantity >= 0)

ALTER TABLE public.inventory_items ADD CONSTRAINT inventory_stock_positive CHECK (current_stock >= 0)

ALTER TABLE public.maintenance_schedules ADD CONSTRAINT maintenance_schedule_dates_valid CHECK (next_due_at >= created_at)

-- 3. Índices de Performance
CREATE INDEX IF NOT EXISTS idx_jobs_status_machine ON public.jobs(status, machine_id)

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC)

CREATE INDEX IF NOT EXISTS idx_security_events_type_created ON public.security_events(event_type, created_at DESC)

CREATE INDEX IF NOT EXISTS idx_machine_health_calc_at ON public.machine_health_metrics(calculated_at DESC)

-- 4. Gatilho de Validação de Estoque
CREATE OR REPLACE FUNCTION public.validate_stock_before_movement()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.quantity < 0 THEN
        IF (SELECT current_stock FROM public.inventory_items WHERE id = NEW.item_id) < ABS(NEW.quantity) THEN
            RAISE EXCEPTION 'Saldo insuficiente em estoque para o item %', NEW.item_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER

DROP TRIGGER IF EXISTS trigger_validate_stock_movement ON public.inventory_movements

CREATE TRIGGER trigger_validate_stock_movement
BEFORE INSERT ON public.inventory_movements
FOR EACH ROW EXECUTE FUNCTION public.validate_stock_before_movement()

-- 5. RLS restritivo para Logs de Auditoria
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY

DROP POLICY IF EXISTS "Audit logs are viewable by staff only" ON public.audit_log

CREATE POLICY "Audit logs are viewable by staff only" 
ON public.audit_log 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('coordinator', 'manager')
    )
)

DROP POLICY IF EXISTS "Deny all changes to audit logs" ON public.audit_log

CREATE POLICY "Deny all changes to audit logs" 
ON public.audit_log 
FOR ALL 
USING (false)
WITH CHECK (false)

-- 6. Função de diagnóstico RLS atualizada
CREATE OR REPLACE FUNCTION public.test_rls_policies(p_table_name text, p_test_user_id uuid, p_role text)
 RETURNS TABLE(operation text, can_select boolean, can_insert boolean, can_update boolean, can_delete boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_can_select BOOLEAN;
    v_can_insert BOOLEAN;
    v_can_update BOOLEAN;
    v_can_delete BOOLEAN;
BEGIN
    SELECT 
        has_table_privilege(p_role, p_table_name, 'SELECT'),
        has_table_privilege(p_role, p_table_name, 'INSERT'),
        has_table_privilege(p_role, p_table_name, 'UPDATE'),
        has_table_privilege(p_role, p_table_name, 'DELETE')
    INTO v_can_select, v_can_insert, v_can_update, v_can_delete;
    
    RETURN QUERY SELECT 
        'privileges_check'::TEXT, 
        v_can_select, 
        v_can_insert, 
        v_can_update, 
        v_can_delete;
END;
$function$
