# public.spc_alerts

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
| 2 | `parameter_id` | `uuid` | não |  |  |  |
| 3 | `measurement_id` | `uuid` | sim |  |  |  |
| 4 | `alert_type` | `text` | não |  |  |  |
| 5 | `severity` | `text` | não | `'warning'::text` |  |  |
| 6 | `title` | `text` | não |  |  |  |
| 7 | `description` | `text` | não |  |  |  |
| 8 | `value` | `numeric` | sim |  |  |  |
| 9 | `is_acknowledged` | `boolean` | não | `false` |  |  |
| 10 | `acknowledged_by` | `uuid` | sim |  |  |  |
| 11 | `acknowledged_at` | `timestamp with time zone` | sim |  |  |  |
| 12 | `resolution` | `text` | sim |  |  |  |
| 13 | `resolved_at` | `timestamp with time zone` | sim |  |  |  |
| 14 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| spc_alerts_measurement_id_fkey | FOREIGN KEY | `FOREIGN KEY (measurement_id) REFERENCES spc_measurements(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| spc_alerts_parameter_id_fkey | FOREIGN KEY | `FOREIGN KEY (parameter_id) REFERENCES spc_control_parameters(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| spc_alerts_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_spc_alerts_measurement_id | btree | measurement_id | não | sim |  | `CREATE INDEX idx_spc_alerts_measurement_id ON public.spc_alerts USING btree (measurement_id)` |
| idx_spc_alerts_parameter_id | btree | parameter_id | não | sim |  | `CREATE INDEX idx_spc_alerts_parameter_id ON public.spc_alerts USING btree (parameter_id)` |
| spc_alerts_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX spc_alerts_pkey ON public.spc_alerts USING btree (id)` |


## Policies (RLS)

### `Authenticated users can view spc alerts`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |

### `Coordinators can manage SPC alerts`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
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
