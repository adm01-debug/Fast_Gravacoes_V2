# public.operator_skills

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
| 3 | `technique_id` | `text` | não |  |  |  |
| 4 | `skill_level` | `skill_level` | não | `'basic'::skill_level` |  |  |
| 5 | `certified_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 6 | `expires_at` | `timestamp with time zone` | sim |  |  |  |
| 7 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 8 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| operator_skills_operator_id_fkey | FOREIGN KEY | `FOREIGN KEY (operator_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| operator_skills_operator_id_technique_id_key | UNIQUE | `UNIQUE (operator_id, technique_id)` |  |  | sim |
| operator_skills_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| operator_skills_operator_id_technique_id_key | btree | operator_id, technique_id | sim | sim |  | `CREATE UNIQUE INDEX operator_skills_operator_id_technique_id_key ON public.operator_skills USING btree (operator_id, technique_id)` |
| operator_skills_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX operator_skills_pkey ON public.operator_skills USING btree (id)` |


## Policies (RLS)

### `Authenticated users can view operator skills`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |

### `Coordinators can manage operator skills`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role)` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_operator_skills_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_
