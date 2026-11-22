# public.tpm_notification_queue

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
| 2 | `machine_id` | `uuid` | sim |  |  |  |
| 3 | `template_id` | `uuid` | sim |  |  |  |
| 4 | `channel` | `text` | não |  |  |  |
| 5 | `severity` | `text` | não |  |  |  |
| 6 | `recipient` | `text` | não |  |  |  |
| 7 | `payload` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 8 | `status` | `text` | sim | `'pending'::text` |  |  |
| 9 | `retry_count` | `integer` | sim | `0` |  |  |
| 10 | `max_retries` | `integer` | sim | `3` |  |  |
| 11 | `next_retry_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 12 | `error_log` | `text` | sim |  |  |  |
| 13 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 14 | `processed_at` | `timestamp with time zone` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| tpm_notification_queue_machine_id_fkey | FOREIGN KEY | `FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| tpm_notification_queue_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| tpm_notification_queue_template_id_fkey | FOREIGN KEY | `FOREIGN KEY (template_id) REFERENCES tpm_notification_templates_published(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_tpm_notification_queue_machine_id | btree | machine_id | não | sim |  | `CREATE INDEX idx_tpm_notification_queue_machine_id ON public.tpm_notification_queue USING btree (machine_id)` |
| idx_tpm_notification_queue_template_id | btree | template_id | não | sim |  | `CREATE INDEX idx_tpm_notification_queue_template_id ON public.tpm_notification_queue USING btree (template_id)` |
| idx_tpm_queue_pending | btree | status, next_retry_at | não | sim | `((status = ANY (ARRAY['pending'::text, 'failed'::text])) AND (retry_count < max_retries))` | `CREATE INDEX idx_tpm_queue_pending ON public.tpm_notification_queue USING btree (status, next_retry_at) WHERE ((status = ANY (ARRAY['pending'::text, 'failed'::text])) AND (retry_count < max_retries))` |
| tpm_notification_queue_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX tpm_notification_queue_pkey ON public.tpm_notification_queue USING btree (id)` |


## Policies (RLS)

### `Active roles can access tpm notification queue`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK | `has_any_active_role()` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
