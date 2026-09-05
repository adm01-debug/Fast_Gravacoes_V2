SELECT proname, pronargs
FROM pg_proc
WHERE proname IN ('has_role','get_my_role','is_staff','is_admin')
ORDER BY proname;