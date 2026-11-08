# public.production_lots

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
| 2 | `lot_number` | `text` | não |  |  |  |
| 3 | `job_id` | `uuid` | sim |  |  |  |
| 4 | `product_name` | `text` | não |  |  |  |
| 5 | `quantity` | `integer` | não | `0` |  |  |
| 6 | `produced_quantity` | `integer` | não | `0` |  |  |
| 7 | `status` | `text` | não | `'active'::text` |  |  |
| 8 | `production_date` | `date` | não | `CURRENT_DATE` |  |  |
| 9 | `expiration_date` | `date` | sim |  |  |  |
| 10 | `notes` | `text` | sim |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| production_lots_job_id_fkey | FOREIGN KEY | `FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| production_lots_lot_number_key | UNIQUE | `UNIQUE (lot_number)` |  |  | sim |
| production_lots_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.lot_components | lot_components_component_lot_id_fkey | component_lot_id | SET NULL |
| public.lot_components | lot_components_lot_id_fkey | lot_id | CASCADE |
| public.lot_movements | lot_movements_lot_id_fkey | lot_id | CASCADE |
| public.lot_quality_inspections | lot_quality_inspections_lot_id_fkey | lot_id | CASCADE |
| public.spc_measurements | spc_measurements_lot_id_fkey | lot_id | SET NULL |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_production_lots_job_id | btree | job_id | não | sim |  | `CREATE INDEX idx_production_lots_job_id ON public.production_lots USING btree (job_id)` |
| production_lots_lot_number_key | btree | lot_number | sim | sim |  | `CREATE UNIQUE INDEX production_lots_lot_number_key ON public.production_lots USING btree (lot_number)` |
| production_lots_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX production_lots_pkey ON public.production_lots USING btree (id)` |


## Policies (RLS)

### `Authenticated users can view production lots`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |

### `Coordinators can manage production lots`

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
| update_production_lots_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_
