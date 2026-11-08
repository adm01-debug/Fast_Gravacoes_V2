# public.password_reset_requests

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 4 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `user_email` | `text` | não |  |  |  |
| 3 | `requested_by_name` | `text` | sim |  |  |  |
| 4 | `status` | `text` | não | `'pending'::text` |  |  |
| 5 | `reviewed_by` | `uuid` | sim |  |  |  |
| 6 | `reviewed_by_name` | `text` | sim |  |  |  |
| 7 | `reviewed_at` | `timestamp with time zone` | sim |  |  |  |
| 8 | `rejection_reason` | `text` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `expires_at` | `timestamp with time zone` | não | `(now() + '24:00:00'::interval)` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| password_reset_requests_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| password_reset_requests_reviewed_by_fkey | FOREIGN KEY | `FOREIGN KEY (reviewed_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| password_reset_requests_status_check | CHECK | `CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_password_reset_requests_email | btree | user_email | não | sim |  | `CREATE INDEX idx_password_reset_requests_email ON public.password_reset_requests USING btree (user_email)` |
| idx_password_reset_requests_reviewed_by | btree | reviewed_by | não | sim |  | `CREATE INDEX idx_password_reset_requests_reviewed_by ON public.password_reset_requests USING btree (reviewed_by)` |
| idx_password_reset_requests_status | btree | status | não | sim |  | `CREATE INDEX idx_password_reset_requests_status ON public.password_reset_requests USING btree (status)` |
| password_reset_requests_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX password_reset_requests_pkey ON public.password_reset_requests USING btree (id)` |


## Policies (RLS)

### `Anyone can request password reset`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | anon, authenticated |
| USING |  |
| WITH CHECK | `(status = 'pending'::text)` |

### `Coordinators and managers can update requests`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role))` |
| WITH CHECK | `(app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role))` |

### `Coordinators and managers can view all requests`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role) OR app_private.has_role(( SELECT auth.uid() AS uid), 'manager'::app_role))` |
| WITH CHECK |  |

### `Coordinators can update password reset requests`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role)` |
| WITH CHECK | `app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role)` |


## Triggers

_nenhum_


## Grants

_nenhum_
