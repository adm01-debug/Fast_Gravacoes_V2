-- R3.3 fix: REVOKE FROM anon não bloqueia anon quando PUBLIC detém EXECUTE
-- (anon herda de PUBLIC por padrão no PostgreSQL).
-- Correção: revogar de PUBLIC e re-conceder a authenticated.

REVOKE EXECUTE ON FUNCTION
  public.auto_reassign_stale_packaging_tasks(),
  public.get_cron_health(),
  public.get_packaging_leaderboard(),
  public.get_packaging_manifest(p_task_ids uuid[]),
  public.get_system_status_summary()
FROM PUBLIC

-- Re-concede às funções UI para usuários autenticados
GRANT EXECUTE ON FUNCTION
  public.get_cron_health(),
  public.get_packaging_leaderboard(),
  public.get_packaging_manifest(p_task_ids uuid[]),
  public.get_system_status_summary()
TO authenticated

-- auto_reassign_stale_packaging_tasks: só chamada pelo pg_cron (postgres),
-- sem grant explícito a nenhuma role de aplicação.
