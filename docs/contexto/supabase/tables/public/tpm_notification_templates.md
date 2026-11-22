# public.tpm_notification_templates

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
| 2 | `channel` | `text` | não |  |  |  |
| 3 | `severity` | `text` | não |  |  |  |
| 4 | `subject` | `text` | sim |  |  |  |
| 5 | `template_body` | `text` | não |  |  |  |
| 6 | `is_active` | `boolean` | sim | `true` |  |  |
| 7 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 8 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 9 | `status` | `text` | sim | `'published'::text` |  |  |
| 10 | `last_published_at` | `timestamp with time zone` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| tpm_notification_templates_channel_check | CHECK | `CHECK (channel = ANY (ARRAY['email'::text, 'whatsapp'::text, 'push'::text]))` |  |  | sim |
| tpm_notification_templates_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| tpm_notification_templates_severity_check | CHECK | `CHECK (severity = ANY (ARRAY['upcoming'::text, 'due'::text, 'overdue'::text, 'critical'::text]))` |  |  | sim |
| tpm_notification_templates_status_check | CHECK | `CHECK (status = ANY (ARRAY['draft'::text, 'published'::text]))` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.tpm_notification_templates_published | tpm_notification_templates_published_template_id_fkey | template_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| tpm_notification_templates_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX tpm_notification_templates_pkey ON public.tpm_notification_templates USING btree (id)` |


## Policies (RLS)

### `Templates editable by admins`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role) OR app_private.has_role(( SELECT auth.uid() AS uid), 'manager'::app_role))` |
| WITH CHECK |  |

### `Templates viewable by authenticated users`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
