# public.geo_blocking_logs

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 2 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `ip_address` | `inet` | não |  |  |  |
| 3 | `country_code` | `text` | sim |  |  |  |
| 4 | `country_name` | `text` | sim |  |  |  |
| 5 | `action` | `text` | não |  |  |  |
| 6 | `user_agent` | `text` | sim |  |  |  |
| 7 | `request_path` | `text` | sim |  |  |  |
| 8 | `user_id` | `uuid` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| geo_blocking_logs_action_check | CHECK | `CHECK (action = ANY (ARRAY['blocked'::text, 'allowed'::text]))` |  |  | sim |
| geo_blocking_logs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| geo_blocking_logs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX geo_blocking_logs_pkey ON public.geo_blocking_logs USING btree (id)` |
| idx_geo_blocking_logs_country | btree | country_code | não | sim |  | `CREATE INDEX idx_geo_blocking_logs_country ON public.geo_blocking_logs USING btree (country_code)` |
| idx_geo_blocking_logs_created | btree | created_at | não | sim |  | `CREATE INDEX idx_geo_blocking_logs_created ON public.geo_blocking_logs USING btree (created_at DESC)` |


## Policies (RLS)

### `Coordinators and managers can view geo logs`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role) OR app_private.has_role(( SELECT auth.uid() AS uid), 'manager'::app_role))` |
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
