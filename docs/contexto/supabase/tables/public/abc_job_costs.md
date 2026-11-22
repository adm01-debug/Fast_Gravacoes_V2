# public.abc_job_costs

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
| 2 | `job_id` | `uuid` | não |  |  |  |
| 3 | `activity_id` | `uuid` | não |  |  |  |
| 4 | `cost_pool_id` | `uuid` | não |  |  |  |
| 5 | `driver_quantity` | `numeric(10,2)` | não | `0` |  |  |
| 6 | `unit_rate` | `numeric(10,4)` | não | `0` |  |  |
| 7 | `total_cost` | `numeric(12,2)` | não | `0` |  |  |
| 8 | `calculated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| abc_job_costs_activity_id_fkey | FOREIGN KEY | `FOREIGN KEY (activity_id) REFERENCES abc_activities(id)` | NO ACTION | NO ACTION | sim |
| abc_job_costs_cost_pool_id_fkey | FOREIGN KEY | `FOREIGN KEY (cost_pool_id) REFERENCES abc_cost_pools(id)` | NO ACTION | NO ACTION | sim |
| abc_job_costs_job_id_fkey | FOREIGN KEY | `FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| abc_job_costs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| abc_job_costs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX abc_job_costs_pkey ON public.abc_job_costs USING btree (id)` |
| idx_abc_job_costs_activity_id | btree | activity_id | não | sim |  | `CREATE INDEX idx_abc_job_costs_activity_id ON public.abc_job_costs USING btree (activity_id)` |
| idx_abc_job_costs_cost_pool_id | btree | cost_pool_id | não | sim |  | `CREATE INDEX idx_abc_job_costs_cost_pool_id ON public.abc_job_costs USING btree (cost_pool_id)` |
| idx_abc_job_costs_job_id | btree | job_id | não | sim |  | `CREATE INDEX idx_abc_job_costs_job_id ON public.abc_job_costs USING btree (job_id)` |


## Policies (RLS)

### `Authenticated users can view job costs`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |

### `Coordinators can manage job costs`

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
