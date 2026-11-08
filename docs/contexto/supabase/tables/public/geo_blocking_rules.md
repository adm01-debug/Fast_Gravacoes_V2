# public.geo_blocking_rules

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
| 2 | `country_code` | `text` | não |  |  |  |
| 3 | `country_name` | `text` | não |  |  |  |
| 4 | `is_blocked` | `boolean` | não | `true` |  |  |
| 5 | `block_type` | `text` | não | `'block'::text` |  |  |
| 6 | `reason` | `text` | sim |  |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `created_by` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| geo_blocking_rules_block_type_check | CHECK | `CHECK (block_type = ANY (ARRAY['block'::text, 'allow'::text]))` |  |  | sim |
| geo_blocking_rules_country_code_key | UNIQUE | `UNIQUE (country_code)` |  |  | sim |
| geo_blocking_rules_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| geo_blocking_rules_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| geo_blocking_rules_country_code_key | btree | country_code | sim | sim |  | `CREATE UNIQUE INDEX geo_blocking_rules_country_code_key ON public.geo_blocking_rules USING btree (country_code)` |
| geo_blocking_rules_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX geo_blocking_rules_pkey ON public.geo_blocking_rules USING btree (id)` |
| idx_geo_blocking_rules_created_by | btree | created_by | não | sim |  | `CREATE INDEX idx_geo_blocking_rules_created_by ON public.geo_blocking_rules USING btree (created_by)` |


## Policies (RLS)

### `Coordinators and managers can manage geo rules`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role))` |
| WITH CHECK | `(app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role))` |

### `Coordinators and managers can view geo blocking rules`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role) OR app_private.has_role(( SELECT auth.uid() AS uid), 'manager'::app_role))` |
| WITH CHECK |  |

### `Coordinators can manage geo blocking rules`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role)` |
| WITH CHECK | `app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_geo_blocking_rules_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_
