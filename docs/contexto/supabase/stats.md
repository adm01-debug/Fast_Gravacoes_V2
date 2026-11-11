# Métricas (voláteis — mudam sem alteração de schema)

Valores aproximados de propósito, para não gerar commits a cada coleta. Fora de `snapshot.json`; o bruto está em `stats.json`.

## Banco

| métrica | valor |
|---|---|
| tamanho | 532.7 MB |
| schema public | 484.8 MB |
| schema app_private | 32.0 KB |


## Tabelas (ordenadas por tamanho)

_nenhum_


## Índices nunca usados (candidatos a remoção; ignore PK/UNIQUE)

_nenhum_


## Storage

_nenhum_


## Auth (agregados)

| métrica | valor |
|---|---|
| usuários (~) | ~10 |
| confirmados (~) | ~10 |
| criados últimos 30d (~) | 1 |

| provider | usuários (~) |
|---|---|
| email | 4 |
| google | 3 |


## Consultas mais custosas (pg_stat_statements, desde o último reset)
| role | chamadas (~) | total ms (~) | média ms | query |
|---|---|---|---|---|
| postgres | ~6.7k | ~5.8M | 854.42 | `select public.snapshot_cron_health()` |
| authenticated | ~43.3k | ~3.5M | 79.92 | `WITH pgrst_source AS (INSERT INTO "public"."error_logs"("component_name", "message", "metadata", "stack", "url") SELECT "pgrst_body"."component_name", "pgrst_body"."message", "pgrst_body"."metadata", "pgrst_body"."stack"` |
| authenticated | ~8.3k | ~996.1k | 119.87 | `WITH pgrst_source AS ( SELECT "public"."jobs".*, row_to_json("jobs_machines_1".*)::jsonb AS "machines", row_to_json("jobs_techniques_1".*)::jsonb AS "techniques" FROM "public"."jobs" LEFT JOIN LATERAL ( SELECT "machines_` |
| postgres | ~280 | ~789.2k | 2788.61 | `SELECT n.nspname AS schema, c.relname AS "table", a.attnum AS position, a.attname AS name, format_type(a.atttypid, a.atttypmod) AS type, NOT a.attnotnull AS nullable, pg_get_expr(d.adbin, d.adrelid) AS "default", NULLIF(` |
| postgres | ~280 | ~669.3k | 2356.82 | `SELECT e.extname AS name, e.extversion AS version, n.nspname AS schema, (SELECT default_version FROM pg_available_extensions a WHERE a.name = e.extname) AS available_version FROM pg_extension e JOIN pg_namespace n ON n.o` |
| authenticated | ~320 | ~628.3k | 1951.13 | `WITH pgrst_source AS (SELECT "pgrst_call".* FROM "public"."get_cron_health"() pgrst_call) SELECT $3::bigint AS total_result_set, pg_catalog.count(_postgrest_t) AS page_total, coalesce(json_agg(_postgrest_t), $4) AS body,` |
| authenticated | ~37.9k | ~625.6k | 16.51 | `WITH pgrst_source AS ( SELECT "public"."inventory_movements".*, row_to_json("inventory_movements_profiles_1".*)::jsonb AS "profiles", row_to_json("inventory_movements_inventory_items_1".*)::jsonb AS "inventory_items" FRO` |
| authenticated | ~29.9k | ~599.3k | 20.04 | `WITH pgrst_source AS ( SELECT "public"."jobs".*, row_to_json("jobs_machines_1".*)::jsonb AS "machines", row_to_json("jobs_techniques_1".*)::jsonb AS "techniques" FROM "public"."jobs" LEFT JOIN LATERAL ( SELECT "machines_` |
| postgres | ~270 | ~561.2k | 2101.76 | `SELECT jobid, runid, status, start_time, end_time, EXTRACT($2 FROM (end_time - start_time))::numeric(10,2) AS seconds, left(return_message, $3) AS return_message FROM (SELECT *, row_number() OVER (PARTITION BY jobid ORDE` |
| authenticated | ~280 | ~542.7k | 1952.25 | `WITH pgrst_source AS ( SELECT "public"."error_logs"."id", "public"."error_logs"."created_at", "public"."error_logs"."message", "public"."error_logs"."component_name", "public"."error_logs"."url" FROM "public"."error_logs` |
| postgres | ~280 | ~407.9k | 1431.26 | `SELECT n.nspname AS schema, p.proname AS name, pg_get_function_identity_arguments(p.oid) AS args, pg_get_function_result(p.oid) AS returns, l.lanname AS language, CASE p.prokind WHEN $1 THEN $2 WHEN $3 THEN $4 WHEN $5 TH` |
| postgres | ~23.6k | ~384.7k | 16.27 | `select net.http_post(url := $1, headers := jsonb_build_object($2,$3,$4,$5), body := jsonb_build_object($6, now())) as request_id` |
| authenticated | ~37.8k | ~360.5k | 9.54 | `WITH pgrst_source AS ( SELECT "public"."business_config".* FROM "public"."business_config" LIMIT $1 OFFSET $2 ) SELECT $3::bigint AS total_result_set, pg_catalog.count(_postgrest_t) AS page_total, coalesce(json_agg(_post` |
| authenticated | ~25.2k | ~357k | 14.18 | `WITH pgrst_source AS ( SELECT "public"."inventory_items".* FROM "public"."inventory_items" ORDER BY "public"."inventory_items"."name" ASC , "public"."inventory_items"."id" ASC LIMIT $1 OFFSET $2 ) SELECT $3::bigint AS to` |
| authenticator | ~380 | ~332.9k | 885.27 | `SELECT name FROM pg_timezone_names` |


## Conexões
| usuário | estado | n |
|---|---|---|
| authenticator | idle | 1 |
| postgres | active | 1 |
| postgres | idle | 1 |
| supabase_admin | active | 2 |
| supabase_admin | idle | 7 |
| supabase_admin |  | 1 |


## Saúde dos serviços
```json
[
  {
    "error": "Service health check failed",
    "healthy": false,
    "name": "auth",
    "status": "UNHEALTHY"
  },
  {
    "error": "Service health check failed",
    "healthy": false,
    "name": "db",
    "status": "UNHEALTHY"
  },
  {
    "healthy": true,
    "name": "pooler",
    "status": "ACTIVE_HEALTHY"
  },
  {
    "healthy": true,
    "info": {
      "connected_cluster": 0,
      "db_connected": true,
      "healthy": true,
      "node": "realtime@2600:1f1c:c90:ad01:df03:4854:4067:cd7c",
      "region": "us-west-1",
      "replication_connected": true
    },
    "name": "realtime",
    "status": "ACTIVE_HEALTHY"
  },
  {
    "error": "Service health check failed",
    "healthy": false,
    "info": {
      "db_schema": "public,graphql_public"
    },
    "name": "rest",
    "status": "UNHEALTHY"
  },
  {
    "error": "Service health check failed",
    "healthy": false,
    "name": "storage",
    "status": "UNHEALTHY"
  }
]
```
