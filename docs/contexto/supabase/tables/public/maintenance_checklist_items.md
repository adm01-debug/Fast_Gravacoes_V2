# public.maintenance_checklist_items

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
| 2 | `checklist_id` | `uuid` | não |  |  |  |
| 3 | `item_order` | `integer` | não | `0` |  |  |
| 4 | `description` | `text` | não |  |  |  |
| 5 | `is_critical` | `boolean` | não | `false` |  |  |
| 6 | `requires_photo` | `boolean` | não | `false` |  |  |
| 7 | `requires_measurement` | `boolean` | não | `false` |  |  |
| 8 | `measurement_unit` | `text` | sim |  |  |  |
| 9 | `min_value` | `numeric` | sim |  |  |  |
| 10 | `max_value` | `numeric` | sim |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| maintenance_checklist_items_checklist_id_fkey | FOREIGN KEY | `FOREIGN KEY (checklist_id) REFERENCES maintenance_checklists(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| maintenance_checklist_items_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.maintenance_item_responses | maintenance_item_responses_checklist_item_id_fkey | checklist_item_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_maintenance_checklist_items_checklist_id | btree | checklist_id | não | sim |  | `CREATE INDEX idx_maintenance_checklist_items_checklist_id ON public.maintenance_checklist_items USING btree (checklist_id)` |
| maintenance_checklist_items_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX maintenance_checklist_items_pkey ON public.maintenance_checklist_items USING btree (id)` |


## Policies (RLS)

### `Authenticated users can view maintenance checklist items`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |

### `Coordinators can manage checklist items`

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

_nenhum_
