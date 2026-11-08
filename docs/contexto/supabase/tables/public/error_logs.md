# public.error_logs

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
| 2 | `message` | `text` | não |  |  |  |
| 3 | `stack` | `text` | sim |  |  |  |
| 4 | `component_name` | `text` | sim |  |  |  |
| 5 | `url` | `text` | sim |  |  |  |
| 6 | `user_id` | `uuid` | sim |  |  |  |
| 7 | `metadata` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `timezone('utc'::text, now())` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| error_logs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| error_logs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX error_logs_pkey ON public.error_logs USING btree (id)` |
| idx_error_logs_created_at_desc | btree | created_at | não | sim |  | `CREATE INDEX idx_error_logs_created_at_desc ON public.error_logs USING btree (created_at DESC)` |


## Policies (RLS)

### `Users can insert error logs`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(( SELECT auth.uid() AS uid) IS NOT NULL)` |

### `Users can view their own error logs`

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
