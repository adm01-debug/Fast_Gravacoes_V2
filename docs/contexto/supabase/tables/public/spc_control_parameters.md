# public.spc_control_parameters

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
| 2 | `name` | `text` | não |  |  |  |
| 3 | `product_name` | `text` | sim |  |  |  |
| 4 | `technique_id` | `text` | sim |  |  |  |
| 5 | `machine_id` | `uuid` | sim |  |  |  |
| 6 | `measurement_type` | `text` | não |  |  |  |
| 7 | `unit` | `text` | não | `'mm'::text` |  |  |
| 8 | `target_value` | `numeric` | não |  |  |  |
| 9 | `upper_spec_limit` | `numeric` | não |  |  |  |
| 10 | `lower_spec_limit` | `numeric` | não |  |  |  |
| 11 | `upper_control_limit` | `numeric` | sim |  |  |  |
| 12 | `lower_control_limit` | `numeric` | sim |  |  |  |
| 13 | `sample_size` | `integer` | não | `5` |  |  |
| 14 | `frequency_minutes` | `integer` | não | `60` |  |  |
| 15 | `is_active` | `boolean` | não | `true` |  |  |
| 16 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 17 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| spc_control_parameters_machine_id_fkey | FOREIGN KEY | `FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| spc_control_parameters_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.spc_alerts | spc_alerts_parameter_id_fkey | parameter_id | CASCADE |
| public.spc_capability_history | spc_capability_history_parameter_id_fkey | parameter_id | CASCADE |
| public.spc_measurements | spc_measurements_parameter_id_fkey | parameter_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_spc_control_parameters_machine_id | btree | machine_id | não | sim |  | `CREATE INDEX idx_spc_control_parameters_machine_id ON public.spc_control_parameters USING btree (machine_id)` |
| spc_control_parameters_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX spc_control_parameters_pkey ON public.spc_control_parameters USING btree (id)` |


## Policies (RLS)

### `Authenticated users can view control parameters`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |

### `Coordinators can manage SPC parameters`

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
| update_spc_control_parameters_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_
