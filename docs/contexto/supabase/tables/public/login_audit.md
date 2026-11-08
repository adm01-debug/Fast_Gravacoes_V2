# public.login_audit

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
| 2 | `user_id` | `uuid` | sim |  |  |  |
| 3 | `user_email` | `text` | não |  |  |  |
| 4 | `ip_address` | `inet` | sim |  |  |  |
| 5 | `user_agent` | `text` | sim |  |  |  |
| 6 | `login_status` | `text` | não |  |  |  |
| 7 | `failure_reason` | `text` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| login_audit_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| login_audit_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_login_audit_created | btree | created_at | não | sim |  | `CREATE INDEX idx_login_audit_created ON public.login_audit USING btree (created_at DESC)` |
| idx_login_audit_user | btree | user_id | não | sim |  | `CREATE INDEX idx_login_audit_user ON public.login_audit USING btree (user_id)` |
| login_audit_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX login_audit_pkey ON public.login_audit USING btree (id)` |


## Policies (RLS)

### `Coordinators can view all login audit`

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

### `Users can view own login audit`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(( SELECT auth.uid() AS uid) = user_id)` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
