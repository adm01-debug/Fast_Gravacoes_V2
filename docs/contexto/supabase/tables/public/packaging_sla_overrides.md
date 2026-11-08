# public.packaging_sla_overrides

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 4 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `technique_id` | `text` | sim |  |  |  |
| 3 | `client` | `text` | sim |  |  |  |
| 4 | `sla_triage_hours` | `numeric` | não | `4` |  |  |
| 5 | `sla_packaging_hours` | `numeric` | não | `8` |  |  |
| 6 | `sla_total_hours` | `numeric` | não | `24` |  |  |
| 7 | `warning_threshold_pct` | `numeric` | não | `75` |  |  |
| 8 | `notes` | `text` | sim |  |  |  |
| 9 | `is_active` | `boolean` | não | `true` |  |  |
| 10 | `created_by` | `uuid` | sim |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| packaging_sla_overrides_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| packaging_sla_overrides_scope_check | CHECK | `CHECK (technique_id IS NOT NULL OR client IS NOT NULL)` |  |  | sim |
| packaging_sla_overrides_technique_id_fkey | FOREIGN KEY | `FOREIGN KEY (technique_id) REFERENCES techniques(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| packaging_sla_overrides_client_idx | btree |  | não | sim |  | `CREATE INDEX packaging_sla_overrides_client_idx ON public.packaging_sla_overrides USING btree (lower(client))` |
| packaging_sla_overrides_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX packaging_sla_overrides_pkey ON public.packaging_sla_overrides USING btree (id)` |
| packaging_sla_overrides_scope_uidx | btree |  | sim | sim |  | `CREATE UNIQUE INDEX packaging_sla_overrides_scope_uidx ON public.packaging_sla_overrides USING btree (COALESCE(technique_id, ''::text), COALESCE(lower(client), ''::text))` |
| packaging_sla_overrides_technique_idx | btree | technique_id | não | sim |  | `CREATE INDEX packaging_sla_overrides_technique_idx ON public.packaging_sla_overrides USING btree (technique_id)` |


## Policies (RLS)

### `packaging_sla_overrides_delete_coord`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role))` |
| WITH CHECK |  |

### `packaging_sla_overrides_insert_coord`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role))` |

### `packaging_sla_overrides_select_authenticated`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |

### `packaging_sla_overrides_update_coord`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role))` |
| WITH CHECK | `(app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_packaging_sla_overrides_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
