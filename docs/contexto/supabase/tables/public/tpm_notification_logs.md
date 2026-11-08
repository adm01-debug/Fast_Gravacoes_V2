# public.tpm_notification_logs

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
| 2 | `machine_id` | `uuid` | sim |  |  |  |
| 3 | `user_id` | `uuid` | sim |  |  |  |
| 4 | `channel` | `text` | não |  |  |  |
| 5 | `severity` | `text` | não |  |  |  |
| 6 | `recipient` | `text` | sim |  |  |  |
| 7 | `status` | `text` | não |  |  |  |
| 8 | `error_message` | `text` | sim |  |  |  |
| 9 | `payload` | `jsonb` | sim |  |  |  |
| 10 | `sent_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 11 | `retry_attempts` | `integer` | sim | `0` |  |  |
| 12 | `last_retry_at` | `timestamp with time zone` | sim |  |  |  |
| 13 | `idempotency_key` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| tpm_notification_logs_machine_id_fkey | FOREIGN KEY | `FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| tpm_notification_logs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| tpm_notification_logs_status_check | CHECK | `CHECK (status = ANY (ARRAY['success'::text, 'failure'::text]))` |  |  | sim |
| tpm_notification_logs_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_tpm_notification_logs_machine_id | btree | machine_id | não | sim |  | `CREATE INDEX idx_tpm_notification_logs_machine_id ON public.tpm_notification_logs USING btree (machine_id)` |
| idx_tpm_notification_logs_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_tpm_notification_logs_user_id ON public.tpm_notification_logs USING btree (user_id)` |
| tpm_notification_logs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX tpm_notification_logs_pkey ON public.tpm_notification_logs USING btree (id)` |


## Policies (RLS)

### `Logs viewable by authenticated users`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
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
