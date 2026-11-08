# public.query_telemetry

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 3 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `operation` | `text` | não |  |  |  |
| 3 | `table_name` | `text` | sim |  |  |  |
| 4 | `rpc_name` | `text` | sim |  |  |  |
| 5 | `duration_ms` | `integer` | não | `0` |  |  |
| 6 | `record_count` | `integer` | sim |  |  |  |
| 7 | `query_limit` | `integer` | sim |  |  |  |
| 8 | `query_offset` | `integer` | sim |  |  |  |
| 9 | `count_mode` | `text` | sim |  |  |  |
| 10 | `severity` | `text` | não | `'normal'::text` |  |  |
| 11 | `error_message` | `text` | sim |  |  |  |
| 12 | `user_id` | `uuid` | sim |  |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| query_telemetry_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_query_telemetry_created_at | btree | created_at | não | sim |  | `CREATE INDEX idx_query_telemetry_created_at ON public.query_telemetry USING btree (created_at DESC)` |
| idx_query_telemetry_severity | btree | severity | não | sim |  | `CREATE INDEX idx_query_telemetry_severity ON public.query_telemetry USING btree (severity)` |
| query_telemetry_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX query_telemetry_pkey ON public.query_telemetry USING btree (id)` |


## Policies (RLS)

### `Coordinators and managers can view telemetry`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role) OR app_private.has_role(( SELECT auth.uid() AS uid), 'manager'::app_role))` |
| WITH CHECK |  |

### `Coordinators can delete telemetry`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role)` |
| WITH CHECK |  |

### `Users can insert own log entries`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `((user_id = auth.uid()) OR (user_id IS NULL) OR app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role))` |


## Triggers

_nenhum_


## Grants

_nenhum_
