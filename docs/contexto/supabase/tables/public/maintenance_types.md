# public.maintenance_types

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
| 1 | `id` | `text` | não |  |  |  |
| 2 | `name` | `text` | não |  |  |  |
| 3 | `description` | `text` | sim |  |  |  |
| 4 | `default_interval_days` | `integer` | não | `30` |  |  |
| 5 | `color` | `text` | não | `'#3b82f6'::text` |  |  |
| 6 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| maintenance_types_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.maintenance_checklists | maintenance_checklists_maintenance_type_id_fkey | maintenance_type_id | NO ACTION |
| public.maintenance_records | maintenance_records_maintenance_type_id_fkey | maintenance_type_id | NO ACTION |
| public.maintenance_schedules | maintenance_schedules_maintenance_type_id_fkey | maintenance_type_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| maintenance_types_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX maintenance_types_pkey ON public.maintenance_types USING btree (id)` |


## Policies (RLS)

### `Authenticated users can view maintenance types`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |

### `Coordinators can manage maintenance types`

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
