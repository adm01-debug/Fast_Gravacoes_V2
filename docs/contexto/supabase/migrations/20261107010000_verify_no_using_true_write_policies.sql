-- Verifica que não existem políticas RLS com USING (true) ou WITH CHECK (true)
-- em operações de escrita.
-- Esta migração é um controlo de segurança: se passar no CI, o banco ao vivo
-- não tem políticas permissivas em INSERT/UPDATE/DELETE/ALL.
-- Se falhar, o CI fica vermelho e a mensagem de erro lista as políticas a corrigir.
-- Nota: versão reforçada (detecta também WITH CHECK). Deve rodar DEPOIS do drop
-- da policy permissiva "Anyone can create password reset requests"
-- (20261107000000_fix_permissive_insert_policies.sql) para não abortar a cadeia.
DO $$
DECLARE
  v_count  integer;
  v_detail text;
BEGIN
  SELECT
    count(*),
    string_agg(schemaname || '.' || tablename || ' [' || cmd || '] "' || policyname || '"' ||
               CASE
                 WHEN qual = 'true' AND with_check = 'true' THEN ' (USING + WITH CHECK)'
                 WHEN qual = 'true' THEN ' (USING)'
                 ELSE ' (WITH CHECK)'
               END, E'\n')
  INTO v_count, v_detail
  FROM pg_policies
  WHERE schemaname = 'public'
    AND (qual       = 'true' OR with_check = 'true')
    AND cmd        IN ('INSERT', 'UPDATE', 'DELETE', 'ALL');

  IF v_count > 0 THEN
    RAISE EXCEPTION
      'Encontradas % política(s) RLS USING(true) ou WITH CHECK(true) em escrita — devem ser corrigidas antes de continuar:\n%',
      v_count, v_detail;
  END IF;
END $$
