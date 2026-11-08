# public.ip_allowlist

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
| 2 | `ip_address` | `inet` | não |  |  |  |
| 3 | `description` | `text` | sim |  |  |  |
| 4 | `is_global` | `boolean` | não | `false` |  |  |
| 5 | `user_id` | `uuid` | sim |  |  |  |
| 6 | `created_by` | `uuid` | sim |  |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `expires_at` | `timestamp with time zone` | sim |  |  |  |
| 9 | `is_active` | `boolean` | não | `true` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| ip_allowlist_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| ip_allowlist_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| ip_or_global | CHECK | `CHECK (is_global = true OR user_id IS NOT NULL)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_ip_allowlist_ip | btree | ip_address | não | sim |  | `CREATE INDEX idx_ip_allowlist_ip ON public.ip_allowlist USING btree (ip_address)` |
| idx_ip_allowlist_user | btree | user_id | não | sim | `(user_id IS NOT NULL)` | `CREATE INDEX idx_ip_allowlist_user ON public.ip_allowlist USING btree (user_id) WHERE (user_id IS NOT NULL)` |
| ip_allowlist_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX ip_allowlist_pkey ON public.ip_allowlist USING btree (id)` |


## Policies (RLS)

### `Coordinators can manage IP allowlist`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role)` |
| WITH CHECK | `app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role)` |

### `Coordinators can view IP allowlist`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role) OR app_private.has_role(( SELECT auth.uid() AS uid), 'manager'::app_role))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
