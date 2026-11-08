# public.push_notifications

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
| 2 | `user_id` | `uuid` | sim |  |  |  |
| 3 | `title` | `text` | não |  |  |  |
| 4 | `body` | `text` | não |  |  |  |
| 5 | `icon` | `text` | sim |  |  |  |
| 6 | `data` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 7 | `sent_at` | `timestamp with time zone` | sim |  |  |  |
| 8 | `status` | `text` | não | `'pending'::text` |  |  |
| 9 | `error_message` | `text` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| push_notifications_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| push_notifications_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_push_notifications_status_created | btree | status, created_at | não | sim | `(status = 'pending'::text)` | `CREATE INDEX idx_push_notifications_status_created ON public.push_notifications USING btree (status, created_at DESC) WHERE (status = 'pending'::text)` |
| idx_push_notifications_user_created | btree | user_id, created_at | não | sim |  | `CREATE INDEX idx_push_notifications_user_created ON public.push_notifications USING btree (user_id, created_at DESC)` |
| idx_push_notifications_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_push_notifications_user_id ON public.push_notifications USING btree (user_id)` |
| push_notifications_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX push_notifications_pkey ON public.push_notifications USING btree (id)` |


## Policies (RLS)

### `Users can delete their own notifications`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(( SELECT auth.uid() AS uid) = user_id)` |
| WITH CHECK |  |

### `Users can insert own notifications`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `((user_id = auth.uid()) OR app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role))` |

### `Users can update their own notifications`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(( SELECT auth.uid() AS uid) = user_id)` |
| WITH CHECK | `(( SELECT auth.uid() AS uid) = user_id)` |

### `Users can view their own notifications`

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
