# public.security_events

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
| 2 | `event_type` | `text` | não |  |  |  |
| 3 | `severity` | `text` | não | `'info'::text` |  |  |
| 4 | `user_id` | `uuid` | sim |  |  |  |
| 5 | `user_email` | `text` | sim |  |  |  |
| 6 | `ip_address` | `inet` | sim |  |  |  |
| 7 | `user_agent` | `text` | sim |  |  |  |
| 8 | `details` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| security_events_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| security_events_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_security_events_created | btree | created_at | não | sim |  | `CREATE INDEX idx_security_events_created ON public.security_events USING btree (created_at DESC)` |
| idx_security_events_type | btree | event_type | não | sim |  | `CREATE INDEX idx_security_events_type ON public.security_events USING btree (event_type)` |
| idx_security_events_type_created | btree | event_type, created_at | não | sim |  | `CREATE INDEX idx_security_events_type_created ON public.security_events USING btree (event_type, created_at DESC)` |
| idx_security_events_type_user | btree | event_type, user_id | não | sim |  | `CREATE INDEX idx_security_events_type_user ON public.security_events USING btree (event_type, user_id)` |
| idx_security_events_user | btree | user_id | não | sim |  | `CREATE INDEX idx_security_events_user ON public.security_events USING btree (user_id)` |
| security_events_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX security_events_pkey ON public.security_events USING btree (id)` |


## Policies (RLS)

### `Coordinators and managers can view security events`

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
| WITH CHECK | `((user_id = auth.uid()) OR app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role))` |


## Triggers

_nenhum_


## Grants

_nenhum_
