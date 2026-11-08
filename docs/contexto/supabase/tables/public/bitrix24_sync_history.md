# public.bitrix24_sync_history

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
| 2 | `sync_type` | `text` | não |  |  |  |
| 3 | `status` | `text` | não |  |  |  |
| 4 | `jobs_synced` | `integer` | sim | `0` |  |  |
| 5 | `jobs_failed` | `integer` | sim | `0` |  |  |
| 6 | `error_message` | `text` | sim |  |  |  |
| 7 | `details` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 8 | `started_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `completed_at` | `timestamp with time zone` | sim |  |  |  |
| 10 | `triggered_by` | `text` | sim | `'manual'::text` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| bitrix24_sync_history_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| bitrix24_sync_history_status_check | CHECK | `CHECK (status = ANY (ARRAY['success'::text, 'partial'::text, 'error'::text]))` |  |  | sim |
| bitrix24_sync_history_sync_type_check | CHECK | `CHECK (sync_type = ANY (ARRAY['pull'::text, 'push'::text, 'webhook'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| bitrix24_sync_history_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX bitrix24_sync_history_pkey ON public.bitrix24_sync_history USING btree (id)` |
| idx_sync_history_started_at | btree | started_at | não | sim |  | `CREATE INDEX idx_sync_history_started_at ON public.bitrix24_sync_history USING btree (started_at DESC)` |
| idx_sync_history_status | btree | status | não | sim |  | `CREATE INDEX idx_sync_history_status ON public.bitrix24_sync_history USING btree (status)` |


## Policies (RLS)

### `Coordinators and managers can view sync history`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role) OR app_private.has_role(( SELECT auth.uid() AS uid), 'manager'::app_role))` |
| WITH CHECK |  |

### `Elevated can insert sync records`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role))` |

### `Elevated can update sync records`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role))` |
| WITH CHECK | `(app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
