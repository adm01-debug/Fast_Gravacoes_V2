# public.geo_blocking_settings

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
| 2 | `is_enabled` | `boolean` | não | `false` |  |  |
| 3 | `mode` | `text` | não | `'blocklist'::text` |  |  |
| 4 | `log_blocked_attempts` | `boolean` | não | `true` |  |  |
| 5 | `block_unknown_countries` | `boolean` | não | `false` |  |  |
| 6 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 7 | `updated_by` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| geo_blocking_settings_mode_check | CHECK | `CHECK (mode = ANY (ARRAY['blocklist'::text, 'allowlist'::text]))` |  |  | sim |
| geo_blocking_settings_mode_chk | CHECK | `CHECK (mode = ANY (ARRAY['blocklist'::text, 'allowlist'::text]))` |  |  | sim |
| geo_blocking_settings_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| geo_blocking_settings_updated_by_fkey | FOREIGN KEY | `FOREIGN KEY (updated_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| geo_blocking_settings_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX geo_blocking_settings_pkey ON public.geo_blocking_settings USING btree (id)` |
| geo_blocking_settings_singleton | btree |  | sim | sim |  | `CREATE UNIQUE INDEX geo_blocking_settings_singleton ON public.geo_blocking_settings USING btree ((true))` |
| idx_geo_blocking_settings_updated_by | btree | updated_by | não | sim |  | `CREATE INDEX idx_geo_blocking_settings_updated_by ON public.geo_blocking_settings USING btree (updated_by)` |


## Policies (RLS)

### `Coordinators and managers can manage geo settings`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role))` |
| WITH CHECK | `(app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role))` |

### `Coordinators and managers can view geo settings`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role) OR app_private.has_role(( SELECT auth.uid() AS uid), 'manager'::app_role))` |
| WITH CHECK |  |

### `Coordinators can manage geo settings`

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
