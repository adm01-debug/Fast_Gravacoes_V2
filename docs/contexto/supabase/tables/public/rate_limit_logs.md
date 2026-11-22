# public.rate_limit_logs

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
| 3 | `endpoint` | `text` | não |  |  |  |
| 4 | `user_id` | `uuid` | sim |  |  |  |
| 5 | `user_email` | `text` | sim |  |  |  |
| 6 | `request_count` | `integer` | não | `1` |  |  |
| 7 | `window_start` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `window_end` | `timestamp with time zone` | não | `(now() + '00:01:00'::interval)` |  |  |
| 9 | `is_blocked` | `boolean` | não | `false` |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| rate_limit_logs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| rate_limit_logs_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_rate_limit_logs_created | btree | created_at | não | sim |  | `CREATE INDEX idx_rate_limit_logs_created ON public.rate_limit_logs USING btree (created_at DESC)` |
| idx_rate_limit_logs_ip | btree | ip_address | não | sim |  | `CREATE INDEX idx_rate_limit_logs_ip ON public.rate_limit_logs USING btree (ip_address)` |
| idx_rate_limit_logs_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_rate_limit_logs_user_id ON public.rate_limit_logs USING btree (user_id)` |
| rate_limit_logs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX rate_limit_logs_pkey ON public.rate_limit_logs USING btree (id)` |


## Policies (RLS)

### `Coordinators and managers can view rate limit logs`

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

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
