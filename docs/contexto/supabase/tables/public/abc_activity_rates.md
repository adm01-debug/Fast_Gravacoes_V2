# public.abc_activity_rates

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
| 2 | `activity_id` | `uuid` | não |  |  |  |
| 3 | `cost_pool_id` | `uuid` | não |  |  |  |
| 4 | `rate_per_unit` | `numeric(10,4)` | não | `0` |  |  |
| 5 | `period_start` | `date` | não |  |  |  |
| 6 | `period_end` | `date` | não |  |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| abc_activity_rates_activity_id_cost_pool_id_period_start_key | UNIQUE | `UNIQUE (activity_id, cost_pool_id, period_start)` |  |  | sim |
| abc_activity_rates_activity_id_fkey | FOREIGN KEY | `FOREIGN KEY (activity_id) REFERENCES abc_activities(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| abc_activity_rates_cost_pool_id_fkey | FOREIGN KEY | `FOREIGN KEY (cost_pool_id) REFERENCES abc_cost_pools(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| abc_activity_rates_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| abc_activity_rates_activity_id_cost_pool_id_period_start_key | btree | activity_id, cost_pool_id, period_start | sim | sim |  | `CREATE UNIQUE INDEX abc_activity_rates_activity_id_cost_pool_id_period_start_key ON public.abc_activity_rates USING btree (activity_id, cost_pool_id, period_start)` |
| abc_activity_rates_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX abc_activity_rates_pkey ON public.abc_activity_rates USING btree (id)` |
| idx_abc_activity_rates_cost_pool_id | btree | cost_pool_id | não | sim |  | `CREATE INDEX idx_abc_activity_rates_cost_pool_id ON public.abc_activity_rates USING btree (cost_pool_id)` |


## Policies (RLS)

### `Authenticated users can view activity rates`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |

### `Coordinators can manage activity rates`

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
| update_abc_activity_rates_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
