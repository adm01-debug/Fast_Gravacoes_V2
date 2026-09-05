
DROP TRIGGER IF EXISTS trg_audit_packaging_tasks ON public.packaging_tasks;
CREATE TRIGGER trg_audit_packaging_tasks
  AFTER INSERT OR UPDATE OR DELETE ON public.packaging_tasks
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS trg_audit_packaging_defects ON public.packaging_defects;
CREATE TRIGGER trg_audit_packaging_defects
  AFTER INSERT OR UPDATE OR DELETE ON public.packaging_defects
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS trg_audit_packaging_task_checklist ON public.packaging_task_checklist;
CREATE TRIGGER trg_audit_packaging_task_checklist
  AFTER INSERT OR UPDATE OR DELETE ON public.packaging_task_checklist
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log(entity_type, entity_id, created_at DESC);
