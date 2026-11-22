-- Verifica que não existem políticas RLS com USING (true) em operações de escrita.
-- Esta migração é um controlo de segurança: se passar no CI, o banco ao vivo
-- não tem políticas permissivas em INSERT/UPDATE/DELETE/ALL.
-- Se falhar, o CI fica vermelho e a mensagem de erro lista as políticas a corrigir.
DO $$
DECLARE
  v_count  integer;
  v_detail text;
BEGIN
  SELECT
    count(*),
    string_agg(schemaname || '.' || tablename || ' [' || cmd || '] "' || policyname || '"', E'\n')
  INTO v_count, v_detail
  FROM pg_policies
  WHERE schemaname = 'public'
    AND qual       = 'true'
    AND cmd        IN ('INSERT', 'UPDATE', 'DELETE', 'ALL');

  IF v_count > 0 THEN
    RAISE EXCEPTION
      'Encontradas % política(s) RLS USING(true) em escrita — devem ser corrigidas antes de continuar:\n%',
      v_count, v_detail;
  END IF;
END $$
