# public.feature_flags

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
| 3 | `description` | `text` | sim |  |  |  |
| 4 | `is_enabled` | `boolean` | sim | `false` |  |  |
| 5 | `rules` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 6 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 7 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| feature_flags_name_key | UNIQUE | `UNIQUE (name)` |  |  | sim |
| feature_flags_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| feature_flags_name_key | btree | name | sim | sim |  | `CREATE UNIQUE INDEX feature_flags_name_key ON public.feature_flags USING btree (name)` |
| feature_flags_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX feature_flags_pkey ON public.feature_flags USING btree (id)` |


## Policies (RLS)

### `Apenas administradores gerenciam flags`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `app_private.has_role(( SELECT auth.uid() AS uid), 'manager'::app_role)` |
| WITH CHECK | `app_private.has_role(( SELECT auth.uid() AS uid), 'manager'::app_role)` |

### `Flags visíveis por todos autenticados`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
