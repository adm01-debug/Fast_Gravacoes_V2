# public.operator_machines

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
| 2 | `operator_id` | `uuid` | não |  |  |  |
| 3 | `machine_id` | `uuid` | não |  |  |  |
| 4 | `assigned_at` | `timestamp with time zone` | não | `now()` |  |  |
| 5 | `assigned_by` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| operator_machines_assigned_by_fkey | FOREIGN KEY | `FOREIGN KEY (assigned_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| operator_machines_machine_id_fkey | FOREIGN KEY | `FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| operator_machines_operator_id_fkey | FOREIGN KEY | `FOREIGN KEY (operator_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| operator_machines_operator_id_machine_id_key | UNIQUE | `UNIQUE (operator_id, machine_id)` |  |  | sim |
| operator_machines_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_operator_machines_assigned_by | btree | assigned_by | não | sim |  | `CREATE INDEX idx_operator_machines_assigned_by ON public.operator_machines USING btree (assigned_by)` |
| idx_operator_machines_machine_id | btree | machine_id | não | sim |  | `CREATE INDEX idx_operator_machines_machine_id ON public.operator_machines USING btree (machine_id)` |
| operator_machines_operator_id_machine_id_key | btree | operator_id, machine_id | sim | sim |  | `CREATE UNIQUE INDEX operator_machines_operator_id_machine_id_key ON public.operator_machines USING btree (operator_id, machine_id)` |
| operator_machines_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX operator_machines_pkey ON public.operator_machines USING btree (id)` |


## Policies (RLS)

### `Authenticated users can view operator machines`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |

### `Coordinators can manage operator machines`

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

_nenhum_
