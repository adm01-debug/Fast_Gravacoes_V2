# public.tpm_notification_templates_published

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
| 2 | `template_id` | `uuid` | sim |  |  |  |
| 3 | `channel` | `text` | não |  |  |  |
| 4 | `severity` | `text` | não |  |  |  |
| 5 | `subject` | `text` | sim |  |  |  |
| 6 | `template_body` | `text` | não |  |  |  |
| 7 | `published_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| tpm_notification_templates_published_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| tpm_notification_templates_published_template_id_fkey | FOREIGN KEY | `FOREIGN KEY (template_id) REFERENCES tpm_notification_templates(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.tpm_notification_queue | tpm_notification_queue_template_id_fkey | template_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_tpm_notification_templates_published_template_id | btree | template_id | não | sim |  | `CREATE INDEX idx_tpm_notification_templates_published_template_id ON public.tpm_notification_templates_published USING btree (template_id)` |
| tpm_notification_templates_published_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX tpm_notification_templates_published_pkey ON public.tpm_notification_templates_published USING btree (id)` |


## Policies (RLS)

### `Published templates viewable by everyone`

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
