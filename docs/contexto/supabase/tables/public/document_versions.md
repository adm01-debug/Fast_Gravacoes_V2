# public.document_versions

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
| 2 | `document_id` | `uuid` | não |  |  |  |
| 3 | `version` | `integer` | não |  |  |  |
| 4 | `file_url` | `text` | não |  |  |  |
| 5 | `file_name` | `text` | não |  |  |  |
| 6 | `file_size` | `integer` | não | `0` |  |  |
| 7 | `change_notes` | `text` | sim |  |  |  |
| 8 | `uploaded_by` | `uuid` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| document_versions_document_id_fkey | FOREIGN KEY | `FOREIGN KEY (document_id) REFERENCES technical_documents(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| document_versions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| document_versions_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX document_versions_pkey ON public.document_versions USING btree (id)` |
| idx_document_versions_document_id | btree | document_id | não | sim |  | `CREATE INDEX idx_document_versions_document_id ON public.document_versions USING btree (document_id)` |


## Policies (RLS)

### `Active roles can view approved document versions`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_any_active_role() AND (EXISTS ( SELECT 1    FROM technical_documents td   WHERE ((td.id = document_versions.document_id) AND ((td.status = 'approved'::text) OR app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role) OR app_private.has_role(( SELECT auth.uid() AS uid), 'manager'::app_role))))))` |
| WITH CHECK |  |

### `Coordinators can manage versions`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role)` |
| WITH CHECK | `app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role)` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
