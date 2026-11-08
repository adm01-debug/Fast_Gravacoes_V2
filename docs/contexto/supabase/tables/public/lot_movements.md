# public.lot_movements

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
| 3 | `movement_type` | `text` | não |  |  |  |
| 4 | `quantity` | `integer` | não |  |  |  |
| 5 | `from_location` | `text` | sim |  |  |  |
| 6 | `to_location` | `text` | sim |  |  |  |
| 7 | `job_id` | `uuid` | sim |  |  |  |
| 8 | `performed_by` | `uuid` | sim |  |  |  |
| 9 | `performed_by_name` | `text` | sim |  |  |  |
| 10 | `reason` | `text` | sim |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| lot_movements_job_id_fkey | FOREIGN KEY | `FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| lot_movements_lot_id_fkey | FOREIGN KEY | `FOREIGN KEY (lot_id) REFERENCES production_lots(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| lot_movements_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_lot_movements_job_id | btree | job_id | não | sim |  | `CREATE INDEX idx_lot_movements_job_id ON public.lot_movements USING btree (job_id)` |
| idx_lot_movements_lot_id | btree | lot_id | não | sim |  | `CREATE INDEX idx_lot_movements_lot_id ON public.lot_movements USING btree (lot_id)` |
| lot_movements_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX lot_movements_pkey ON public.lot_movements USING btree (id)` |


## Policies (RLS)

### `Active roles can insert movements`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `has_any_active_role()` |

### `Authenticated users can view lot movements`

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
