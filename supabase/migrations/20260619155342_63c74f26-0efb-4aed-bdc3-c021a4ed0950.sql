DO $$
DECLARE
  policy_record RECORD;
  optimized_using TEXT;
  optimized_check TEXT;
BEGIN
  FOR policy_record IN
    SELECT
      n.nspname AS schema_name,
      c.relname AS table_name,
      p.polname AS policy_name,
      pg_get_expr(p.polqual, p.polrelid) AS using_expr,
      pg_get_expr(p.polwithcheck, p.polrelid) AS check_expr
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND (
        pg_get_expr(p.polqual, p.polrelid) LIKE '%auth.uid()%'
        OR pg_get_expr(p.polwithcheck, p.polrelid) LIKE '%auth.uid()%'
      )
    ORDER BY n.nspname, c.relname, p.polname
  LOOP
    IF policy_record.using_expr IS NOT NULL
       AND policy_record.using_expr LIKE '%auth.uid()%' THEN
      optimized_using := replace(policy_record.using_expr, 'auth.uid()', '( SELECT auth.uid() AS uid)');

      EXECUTE format(
        'ALTER POLICY %I ON %I.%I USING (%s)',
        policy_record.policy_name,
        policy_record.schema_name,
        policy_record.table_name,
        optimized_using
      );
    END IF;

    IF policy_record.check_expr IS NOT NULL
       AND policy_record.check_expr LIKE '%auth.uid()%' THEN
      optimized_check := replace(policy_record.check_expr, 'auth.uid()', '( SELECT auth.uid() AS uid)');

      EXECUTE format(
        'ALTER POLICY %I ON %I.%I WITH CHECK (%s)',
        policy_record.policy_name,
        policy_record.schema_name,
        policy_record.table_name,
        optimized_check
      );
    END IF;
  END LOOP;
END $$;