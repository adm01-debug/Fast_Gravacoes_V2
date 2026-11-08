# public.spc_capability_history

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
| 3 | `period_start` | `date` | não |  |  |  |
| 4 | `period_end` | `date` | não |  |  |  |
| 5 | `sample_count` | `integer` | não |  |  |  |
| 6 | `mean` | `numeric` | não |  |  |  |
| 7 | `std_deviation` | `numeric` | não |  |  |  |
| 8 | `cp` | `numeric` | sim |  |  |  |
| 9 | `cpk` | `numeric` | sim |  |  |  |
| 10 | `pp` | `numeric` | sim |  |  |  |
| 11 | `ppk` | `numeric` | sim |  |  |  |
| 12 | `calculated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| spc_capability_history_parameter_id_fkey | FOREIGN KEY | `FOREIGN KEY (parameter_id) REFERENCES spc_control_parameters(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| spc_capability_history_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_spc_capability_history_parameter_id | btree | parameter_id | não | sim |  | `CREATE INDEX idx_spc_capability_history_parameter_id ON public.spc_capability_history USING btree (parameter_id)` |
| spc_capability_history_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX spc_capability_history_pkey ON public.spc_capability_history USING btree (id)` |


## Policies (RLS)

### `Authenticated users can view capability history`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |

### `Only coordinators can manage capability history`

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

_nenhum_
