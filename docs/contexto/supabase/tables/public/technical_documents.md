# public.technical_documents

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
| 2 | `technical_sheet_id` | `uuid` | sim |  |  |  |
| 3 | `title` | `text` | não |  |  |  |
| 4 | `description` | `text` | sim |  |  |  |
| 5 | `file_url` | `text` | não |  |  |  |
| 6 | `file_name` | `text` | não |  |  |  |
| 7 | `file_size` | `integer` | não | `0` |  |  |
| 8 | `file_type` | `text` | não | `'application/pdf'::text` |  |  |
| 9 | `version` | `integer` | não | `1` |  |  |
| 10 | `is_current` | `boolean` | não | `true` |  |  |
| 11 | `status` | `text` | não | `'pending'::text` |  |  |
| 12 | `approved_by` | `uuid` | sim |  |  |  |
| 13 | `approved_at` | `timestamp with time zone` | sim |  |  |  |
| 14 | `rejection_reason` | `text` | sim |  |  |  |
| 15 | `uploaded_by` | `uuid` | sim |  |  |  |
| 16 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 17 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| technical_documents_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| technical_documents_status_check | CHECK | `CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))` |  |  | sim |
| technical_documents_technical_sheet_id_fkey | FOREIGN KEY | `FOREIGN KEY (technical_sheet_id) REFERENCES technical_sheets(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.document_versions | document_versions_document_id_fkey | document_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_technical_documents_technical_sheet_id | btree | technical_sheet_id | não | sim |  | `CREATE INDEX idx_technical_documents_technical_sheet_id ON public.technical_documents USING btree (technical_sheet_id)` |
| technical_documents_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX technical_documents_pkey ON public.technical_documents USING btree (id)` |


## Policies (RLS)

### `Active roles can view approved documents`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_any_active_role() AND ((status = 'approved'::text) OR app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role) OR app_private.has_role(( SELECT auth.uid() AS uid), 'manager'::app_role)))` |
| WITH CHECK |  |

### `Coordinators can manage documents`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role) OR app_private.has_role(( SELECT auth.uid() AS uid), 'manager'::app_role))` |
| WITH CHECK | `(app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role) OR app_private.has_role(( SELECT auth.uid() AS uid), 'manager'::app_role))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_technical_documents_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_
