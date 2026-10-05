-- Realinha as FKs das tabelas auxiliares de execução TPM.
-- O histórico versionado cria tpm_execution_alerts / tpm_execution_supplies /
-- tpm_parameter_alerts / tpm_execution_parts com execution_id → tpm_executions,
-- mas o app sempre gravou nessas tabelas o id de maintenance_records (o fluxo
-- "concluir manutenção" não cria linha em tpm_executions). Em produção as FKs
-- já apontam para maintenance_records (senão todo insert do fluxo falharia) —
-- esta migration só age onde o histórico divergiu do deploy real.
-- NOT VALID: passa a valer para novas linhas sem exigir validar as antigas.

DO $$
DECLARE
  t text;
  c record;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'tpm_execution_alerts',
    'tpm_execution_supplies',
    'tpm_parameter_alerts',
    'tpm_execution_parts'
  ] LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;

    FOR c IN
      SELECT con.conname
      FROM pg_constraint con
      JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
      WHERE con.conrelid = ('public.' || t)::regclass
        AND con.contype = 'f'
        AND att.attname = 'execution_id'
        AND con.confrelid = 'public.tpm_executions'::regclass
    LOOP
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', t, c.conname);
    END LOOP;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint con
      JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
      WHERE con.conrelid = ('public.' || t)::regclass
        AND con.contype = 'f'
        AND att.attname = 'execution_id'
        AND con.confrelid = 'public.maintenance_records'::regclass
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (execution_id) REFERENCES public.maintenance_records(id) ON DELETE CASCADE NOT VALID',
        t, t || '_execution_id_record_fkey'
      );
    END IF;
  END LOOP;
END $$;
