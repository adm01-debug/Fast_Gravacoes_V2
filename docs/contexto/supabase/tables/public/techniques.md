# public.techniques

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
| 3 | `short_name` | `text` | não |  |  |  |
| 4 | `color` | `text` | não | `'#3b82f6'::text` |  |  |
| 5 | `setup_time` | `integer` | não | `10` |  |  |
| 6 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 7 | `low_threshold` | `integer` | sim | `30` |  |  |
| 8 | `medium_threshold` | `integer` | sim | `70` |  |  |
| 9 | `high_threshold` | `integer` | sim | `90` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| techniques_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.abc_activities | abc_activities_technique_id_fkey | technique_id | NO ACTION |
| public.jobs | jobs_technique_id_fkey | technique_id | NO ACTION |
| public.machines | machines_technique_id_fkey | technique_id | NO ACTION |
| public.maintenance_checklists | maintenance_checklists_technique_id_fkey | technique_id | NO ACTION |
| public.packaging_sla_overrides | packaging_sla_overrides_technique_id_fkey | technique_id | CASCADE |
| public.technical_sheets | technical_sheets_technique_id_fkey | technique_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| techniques_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX techniques_pkey ON public.techniques USING btree (id)` |


## Policies (RLS)

### `Authenticated users can view techniques`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |

### `Coordinators can manage techniques`

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
