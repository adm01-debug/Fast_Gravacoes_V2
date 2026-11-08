# public.maintenance_checklists

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
| 2 | `maintenance_type_id` | `text` | não |  |  |  |
| 3 | `name` | `text` | não |  |  |  |
| 4 | `description` | `text` | sim |  |  |  |
| 5 | `is_active` | `boolean` | não | `true` |  |  |
| 6 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 7 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `machine_category` | `text` | sim |  |  |  |
| 9 | `version` | `integer` | sim | `1` |  |  |
| 10 | `technique_id` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| maintenance_checklists_maintenance_type_id_fkey | FOREIGN KEY | `FOREIGN KEY (maintenance_type_id) REFERENCES maintenance_types(id)` | NO ACTION | NO ACTION | sim |
| maintenance_checklists_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| maintenance_checklists_technique_id_fkey | FOREIGN KEY | `FOREIGN KEY (technique_id) REFERENCES techniques(id)` | NO ACTION | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.maintenance_checklist_items | maintenance_checklist_items_checklist_id_fkey | checklist_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_checklists_technique | btree | technique_id | não | sim |  | `CREATE INDEX idx_checklists_technique ON public.maintenance_checklists USING btree (technique_id)` |
| idx_maintenance_checklists_maintenance_type_id | btree | maintenance_type_id | não | sim |  | `CREATE INDEX idx_maintenance_checklists_maintenance_type_id ON public.maintenance_checklists USING btree (maintenance_type_id)` |
| maintenance_checklists_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX maintenance_checklists_pkey ON public.maintenance_checklists USING btree (id)` |


## Policies (RLS)

### `Authenticated users can view maintenance checklists`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |

### `Coordinators can manage maintenance checklists`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role)` |
| WITH CHECK | `app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_maintenance_checklists_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_
