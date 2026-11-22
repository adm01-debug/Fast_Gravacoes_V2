# public.energy_consumption

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
| 2 | `machine_id` | `uuid` | sim |  |  |  |
| 3 | `recorded_at` | `timestamp with time zone` | não | `now()` |  |  |
| 4 | `consumption_kwh` | `numeric` | não | `0` |  |  |
| 5 | `power_factor` | `numeric` | sim |  |  |  |
| 6 | `voltage` | `numeric` | sim |  |  |  |
| 7 | `current_amps` | `numeric` | sim |  |  |  |
| 8 | `peak_demand_kw` | `numeric` | sim |  |  |  |
| 9 | `cost_per_kwh` | `numeric` | sim | `0.65` |  |  |
| 10 | `total_cost` | `numeric` | sim |  |  |  |
| 11 | `reading_type` | `text` | não | `'automatic'::text` |  |  |
| 12 | `notes` | `text` | sim |  |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| energy_consumption_machine_id_fkey | FOREIGN KEY | `FOREIGN KEY (machine_id) REFERENCES machines(id)` | NO ACTION | NO ACTION | sim |
| energy_consumption_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| energy_consumption_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX energy_consumption_pkey ON public.energy_consumption USING btree (id)` |
| idx_energy_consumption_machine | btree | machine_id | não | sim |  | `CREATE INDEX idx_energy_consumption_machine ON public.energy_consumption USING btree (machine_id)` |
| idx_energy_consumption_recorded_at | btree | recorded_at | não | sim |  | `CREATE INDEX idx_energy_consumption_recorded_at ON public.energy_consumption USING btree (recorded_at)` |


## Policies (RLS)

### `Authenticated users can view energy consumption`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |

### `Coordinators can manage energy consumption`

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
