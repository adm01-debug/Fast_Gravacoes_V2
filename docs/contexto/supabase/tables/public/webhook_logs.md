# public.webhook_logs

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
| 2 | `source` | `text` | não |  |  |  |
| 3 | `event` | `text` | não |  |  |  |
| 4 | `payload` | `jsonb` | sim |  |  |  |
| 5 | `status_code` | `integer` | sim |  |  |  |
| 6 | `error_message` | `text` | sim |  |  |  |
| 7 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| webhook_logs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_webhook_logs_created_at | btree | created_at | não | sim |  | `CREATE INDEX idx_webhook_logs_created_at ON public.webhook_logs USING btree (created_at DESC)` |
| idx_webhook_logs_source | btree | source | não | sim |  | `CREATE INDEX idx_webhook_logs_source ON public.webhook_logs USING btree (source)` |
| webhook_logs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX webhook_logs_pkey ON public.webhook_logs USING btree (id)` |


## Policies (RLS)

### `Managers can view webhook logs`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `app_private.has_role(( SELECT auth.uid() AS uid), 'manager'::app_role)` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
