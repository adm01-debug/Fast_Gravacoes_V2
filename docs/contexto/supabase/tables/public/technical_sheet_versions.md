# public.technical_sheet_versions

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
| 2 | `sheet_id` | `uuid` | não |  |  |  |
| 3 | `version_number` | `integer` | não |  |  |  |
| 4 | `data` | `jsonb` | não |  |  |  |
| 5 | `created_by` | `uuid` | sim |  |  |  |
| 6 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| technical_sheet_versions_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| technical_sheet_versions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| technical_sheet_versions_sheet_id_fkey | FOREIGN KEY | `FOREIGN KEY (sheet_id) REFERENCES technical_sheets(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_technical_sheet_versions_created_by | btree | created_by | não | sim |  | `CREATE INDEX idx_technical_sheet_versions_created_by ON public.technical_sheet_versions USING btree (created_by)` |
| idx_technical_sheet_versions_sheet_id | btree | sheet_id | não | sim |  | `CREATE INDEX idx_technical_sheet_versions_sheet_id ON public.technical_sheet_versions USING btree (sheet_id)` |
| technical_sheet_versions_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX technical_sheet_versions_pkey ON public.technical_sheet_versions USING btree (id)` |


## Policies (RLS)

### `Role-based technical sheet versions visibility`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role) OR app_private.has_role(( SELECT auth.uid() AS uid), 'manager'::app_role) OR app_private.has_role(( SELECT auth.uid() AS uid), 'admin'::app_role) OR (app_private.has_role(( SELECT auth.uid() AS uid), 'operator'::app_role) AND (EXISTS ( SELECT 1    FROM technical_sheets ts   WHERE ((ts.id = technical_sheet_versions.sheet_id) AND (ts.status = 'published'::sheet_status))))))` |
| WITH CHECK |  |

### `Versions can be inserted by coordinators`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role)` |


## Triggers

_nenhum_


## Grants

_nenhum_
