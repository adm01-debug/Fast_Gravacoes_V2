# public.machine_health_metrics

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
| 2 | `machine_id` | `uuid` | não |  |  |  |
| 3 | `period_start` | `date` | não |  |  |  |
| 4 | `period_end` | `date` | não |  |  |  |
| 5 | `total_jobs` | `integer` | não | `0` |  |  |
| 6 | `total_produced` | `integer` | não | `0` |  |  |
| 7 | `total_losses` | `integer` | não | `0` |  |  |
| 8 | `total_production_hours` | `numeric(10,2)` | não | `0` |  |  |
| 9 | `maintenance_count` | `integer` | não | `0` |  |  |
| 10 | `corrective_maintenance_count` | `integer` | não | `0` |  |  |
| 11 | `avg_time_between_failures` | `numeric(10,2)` | sim |  |  |  |
| 12 | `avg_repair_time` | `numeric(10,2)` | sim |  |  |  |
| 13 | `oee_score` | `numeric(5,2)` | sim |  |  |  |
| 14 | `calculated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| machine_health_metrics_machine_id_fkey | FOREIGN KEY | `FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| machine_health_metrics_machine_id_period_start_period_end_key | UNIQUE | `UNIQUE (machine_id, period_start, period_end)` |  |  | sim |
| machine_health_metrics_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_machine_health_calc_at | btree | calculated_at | não | sim |  | `CREATE INDEX idx_machine_health_calc_at ON public.machine_health_metrics USING btree (calculated_at DESC)` |
| machine_health_metrics_machine_id_period_start_period_end_key | btree | machine_id, period_start, period_end | sim | sim |  | `CREATE UNIQUE INDEX machine_health_metrics_machine_id_period_start_period_end_key ON public.machine_health_metrics USING btree (machine_id, period_start, period_end)` |
| machine_health_metrics_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX machine_health_metrics_pkey ON public.machine_health_metrics USING btree (id)` |


## Policies (RLS)

### `Authenticated users can view health metrics`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |

### `Only coordinators can manage health metrics`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role))` |
| WITH CHECK | `(app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
