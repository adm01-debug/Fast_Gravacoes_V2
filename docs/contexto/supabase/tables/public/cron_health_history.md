# public.cron_health_history

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 1 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `jobid` | `bigint` | não |  |  |  |
| 3 | `jobname` | `text` | sim |  |  |  |
| 4 | `schedule` | `text` | sim |  |  |  |
| 5 | `active` | `boolean` | sim |  |  |  |
| 6 | `last_status` | `text` | sim |  |  |  |
| 7 | `last_run` | `timestamp with time zone` | sim |  |  |  |
| 8 | `last_duration_ms` | `integer` | sim |  |  |  |
| 9 | `consecutive_failures` | `integer` | não | `0` |  |  |
| 10 | `last_error` | `text` | sim |  |  |  |
| 11 | `captured_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 13 | `is_stale` | `boolean` | não | `false` |  |  |
| 14 | `expected_interval_minutes` | `integer` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| cron_health_history_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| cron_health_history_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX cron_health_history_pkey ON public.cron_health_history USING btree (id)` |
| idx_cron_health_history_captured_at | btree | captured_at | não | sim |  | `CREATE INDEX idx_cron_health_history_captured_at ON public.cron_health_history USING btree (captured_at DESC)` |
| idx_cron_health_history_job_time | btree | jobid, captured_at | não | sim |  | `CREATE INDEX idx_cron_health_history_job_time ON public.cron_health_history USING btree (jobid, captured_at DESC)` |


## Policies (RLS)

### `Coordenadores e gestores leem historico de cron`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
