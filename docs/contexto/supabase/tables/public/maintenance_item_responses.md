# public.maintenance_item_responses

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
| 2 | `record_id` | `uuid` | não |  |  |  |
| 3 | `checklist_item_id` | `uuid` | não |  |  |  |
| 4 | `is_checked` | `boolean` | não | `false` |  |  |
| 5 | `measurement_value` | `numeric` | sim |  |  |  |
| 6 | `notes` | `text` | sim |  |  |  |
| 7 | `photo_url` | `text` | sim |  |  |  |
| 8 | `responded_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| maintenance_item_responses_checklist_item_id_fkey | FOREIGN KEY | `FOREIGN KEY (checklist_item_id) REFERENCES maintenance_checklist_items(id)` | NO ACTION | NO ACTION | sim |
| maintenance_item_responses_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| maintenance_item_responses_record_id_fkey | FOREIGN KEY | `FOREIGN KEY (record_id) REFERENCES maintenance_records(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_maintenance_item_responses_checklist_item_id | btree | checklist_item_id | não | sim |  | `CREATE INDEX idx_maintenance_item_responses_checklist_item_id ON public.maintenance_item_responses USING btree (checklist_item_id)` |
| idx_maintenance_item_responses_record_id | btree | record_id | não | sim |  | `CREATE INDEX idx_maintenance_item_responses_record_id ON public.maintenance_item_responses USING btree (record_id)` |
| maintenance_item_responses_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX maintenance_item_responses_pkey ON public.maintenance_item_responses USING btree (id)` |


## Policies (RLS)

### `Active roles can manage item responses`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK | `has_any_active_role()` |

### `Authenticated users can view item responses`

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

_nenhum_
