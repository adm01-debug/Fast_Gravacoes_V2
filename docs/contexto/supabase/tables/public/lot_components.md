# public.lot_components

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
| 2 | `lot_id` | `uuid` | não |  |  |  |
| 3 | `component_lot_id` | `uuid` | sim |  |  |  |
| 4 | `material_id` | `uuid` | sim |  |  |  |
| 5 | `component_name` | `text` | não |  |  |  |
| 6 | `quantity_used` | `numeric` | não | `0` |  |  |
| 7 | `unit` | `text` | sim | `'un'::text` |  |  |
| 8 | `supplier` | `text` | sim |  |  |  |
| 9 | `batch_number` | `text` | sim |  |  |  |
| 10 | `notes` | `text` | sim |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| lot_components_component_lot_id_fkey | FOREIGN KEY | `FOREIGN KEY (component_lot_id) REFERENCES production_lots(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| lot_components_lot_id_fkey | FOREIGN KEY | `FOREIGN KEY (lot_id) REFERENCES production_lots(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| lot_components_material_id_fkey | FOREIGN KEY | `FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| lot_components_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_lot_components_component_lot_id | btree | component_lot_id | não | sim |  | `CREATE INDEX idx_lot_components_component_lot_id ON public.lot_components USING btree (component_lot_id)` |
| idx_lot_components_lot_id | btree | lot_id | não | sim |  | `CREATE INDEX idx_lot_components_lot_id ON public.lot_components USING btree (lot_id)` |
| idx_lot_components_material_id | btree | material_id | não | sim |  | `CREATE INDEX idx_lot_components_material_id ON public.lot_components USING btree (material_id)` |
| lot_components_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX lot_components_pkey ON public.lot_components USING btree (id)` |


## Policies (RLS)

### `Authenticated users can view lot components`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |

### `Coordinators can manage lot components`

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
| audit_lot_components | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.audit_trigger_func |


## Grants

_nenhum_
