# public.inventory_movements

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
| 2 | `item_id` | `uuid` | sim |  |  |  |
| 3 | `user_id` | `uuid` | sim |  |  |  |
| 4 | `type` | `text` | não |  |  |  |
| 5 | `quantity` | `numeric` | não |  |  |  |
| 6 | `reason` | `text` | sim |  |  |  |
| 7 | `job_id` | `uuid` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 9 | `from_location` | `text` | sim |  |  |  |
| 10 | `to_location` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| inventory_movements_item_id_fkey | FOREIGN KEY | `FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| inventory_movements_job_id_fkey | FOREIGN KEY | `FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| inventory_movements_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| inventory_movements_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_inventory_movements_item_id | btree | item_id | não | sim |  | `CREATE INDEX idx_inventory_movements_item_id ON public.inventory_movements USING btree (item_id)` |
| idx_inventory_movements_job_id | btree | job_id | não | sim |  | `CREATE INDEX idx_inventory_movements_job_id ON public.inventory_movements USING btree (job_id)` |
| idx_inventory_movements_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_inventory_movements_user_id ON public.inventory_movements USING btree (user_id)` |
| inventory_movements_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX inventory_movements_pkey ON public.inventory_movements USING btree (id)` |


## Policies (RLS)

### `Active roles can view inventory movements`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| tr_rollback_inventory_stock | BEFORE | DELETE | ROW | enabled | public.rollback_inventory_stock |
| tr_update_inventory_stock | AFTER | INSERT | ROW | enabled | public.update_inventory_stock |
| tr_validate_inventory_stock | BEFORE | INSERT | ROW | enabled | public.validate_inventory_stock |
| trigger_validate_stock_movement | BEFORE | INSERT | ROW | enabled | public.validate_stock_before_movement |


## Grants

_nenhum_
