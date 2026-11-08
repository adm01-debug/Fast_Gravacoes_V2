# public.packaging_settings

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
| 2 | `package_types` | `text[]` | não | `ARRAY['caixa'::text, 'saco'::text, 'envelope'::text, 'pallet'::text]` |  |  |
| 3 | `defect_reasons` | `text[]` | não | `ARRAY['print_misalignment'::text, 'color_deviation'::text, 'scratch'::text, 'contamination'::text, 'wrong_material'::text, 'dimensional'::text, 'other'::text]` |  |  |
| 4 | `weight_unit` | `text` | não | `'kg'::text` |  |  |
| 5 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 6 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 7 | `sla_triage_hours` | `numeric` | não | `4` |  |  |
| 8 | `sla_packaging_hours` | `numeric` | não | `8` |  |  |
| 9 | `sla_total_hours` | `numeric` | não | `24` |  |  |
| 10 | `warning_threshold_pct` | `numeric` | não | `75` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| packaging_settings_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| packaging_settings_weight_unit_check | CHECK | `CHECK (weight_unit = ANY (ARRAY['kg'::text, 'g'::text, 'lb'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| packaging_settings_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX packaging_settings_pkey ON public.packaging_settings USING btree (id)` |


## Policies (RLS)

### `All active users read settings`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |

### `Staff manage settings`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role))` |
| WITH CHECK | `(app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_packaging_settings_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_
