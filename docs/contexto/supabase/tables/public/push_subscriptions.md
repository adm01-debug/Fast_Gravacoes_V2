# public.push_subscriptions

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
| 2 | `user_id` | `uuid` | não |  |  |  |
| 3 | `endpoint` | `text` | não |  |  |  |
| 4 | `p256dh` | `text` | não |  |  |  |
| 5 | `auth` | `text` | não |  |  |  |
| 6 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 7 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| push_subscriptions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| push_subscriptions_user_id_endpoint_key | UNIQUE | `UNIQUE (user_id, endpoint)` |  |  | sim |
| push_subscriptions_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_push_subscriptions_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions USING btree (user_id)` |
| push_subscriptions_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX push_subscriptions_pkey ON public.push_subscriptions USING btree (id)` |
| push_subscriptions_user_id_endpoint_key | btree | user_id, endpoint | sim | sim |  | `CREATE UNIQUE INDEX push_subscriptions_user_id_endpoint_key ON public.push_subscriptions USING btree (user_id, endpoint)` |


## Policies (RLS)

### `Users can manage their own subscriptions`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(( SELECT auth.uid() AS uid) = user_id)` |
| WITH CHECK | `(( SELECT auth.uid() AS uid) = user_id)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_push_subscriptions_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_
