# public.spc_measurements

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 3 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `parameter_id` | `uuid` | não |  |  |  |
| 3 | `job_id` | `uuid` | sim |  |  |  |
| 4 | `lot_id` | `uuid` | sim |  |  |  |
| 5 | `sample_number` | `integer` | não |  |  |  |
| 6 | `values` | `numeric[]` | não |  |  |  |
| 7 | `mean_value` | `numeric` | não |  |  |  |
| 8 | `range_value` | `numeric` | não |  |  |  |
| 9 | `std_deviation` | `numeric` | sim |  |  |  |
| 10 | `is_in_control` | `boolean` | não | `true` |  |  |
| 11 | `out_of_control_type` | `text` | sim |  |  |  |
| 12 | `operator_id` | `uuid` | sim |  |  |  |
| 13 | `operator_name` | `text` | sim |  |  |  |
| 14 | `notes` | `text` | sim |  |  |  |
| 15 | `measured_at` | `timestamp with time zone` | não | `now()` |  |  |
| 16 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| spc_measurements_job_id_fkey | FOREIGN KEY | `FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| spc_measurements_lot_id_fkey | FOREIGN KEY | `FOREIGN KEY (lot_id) REFERENCES production_lots(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| spc_measurements_parameter_id_fkey | FOREIGN KEY | `FOREIGN KEY (parameter_id) REFERENCES spc_control_parameters(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| spc_measurements_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.spc_alerts | spc_alerts_measurement_id_fkey | measurement_id | SET NULL |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_spc_measurements_job_id | btree | job_id | não | sim |  | `CREATE INDEX idx_spc_measurements_job_id ON public.spc_measurements USING btree (job_id)` |
| idx_spc_measurements_lot_id | btree | lot_id | não | sim |  | `CREATE INDEX idx_spc_measurements_lot_id ON public.spc_measurements USING btree (lot_id)` |
| idx_spc_measurements_parameter_id | btree | parameter_id | não | sim |  | `CREATE INDEX idx_spc_measurements_parameter_id ON public.spc_measurements USING btree (parameter_id)` |
| spc_measurements_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX spc_measurements_pkey ON public.spc_measurements USING btree (id)` |


## Policies (RLS)

### `Active roles can insert measurements`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `has_any_active_role()` |

### `Authenticated users can view SPC measurements`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |

### `Operators insert own spc measurements`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `((operator_id = auth.uid()) OR app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role))` |


## Triggers

_nenhum_


## Grants

_nenhum_
