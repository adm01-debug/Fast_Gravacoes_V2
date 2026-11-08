# public.bitrix24_field_mappings

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
| 2 | `mapping_type` | `text` | não |  |  |  |
| 3 | `source_key` | `text` | não |  |  |  |
| 4 | `target_key` | `text` | não |  |  |  |
| 5 | `priority` | `integer` | não | `0` |  |  |
| 6 | `is_active` | `boolean` | não | `true` |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| bitrix24_field_mappings_mapping_type_source_key_target_key_key | UNIQUE | `UNIQUE (mapping_type, source_key, target_key)` |  |  | sim |
| bitrix24_field_mappings_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| bitrix24_field_mappings_mapping_type_source_key_target_key_key | btree | mapping_type, source_key, target_key | sim | sim |  | `CREATE UNIQUE INDEX bitrix24_field_mappings_mapping_type_source_key_target_key_key ON public.bitrix24_field_mappings USING btree (mapping_type, source_key, target_key)` |
| bitrix24_field_mappings_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX bitrix24_field_mappings_pkey ON public.bitrix24_field_mappings USING btree (id)` |


## Policies (RLS)

### `Authenticated users can view field mappings`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |

### `Coordinators can manage mappings`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role)` |
| WITH CHECK | `app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_bitrix24_field_mappings_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_
