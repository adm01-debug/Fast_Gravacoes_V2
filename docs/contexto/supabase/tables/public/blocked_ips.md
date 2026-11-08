# public.blocked_ips

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
| 3 | `reason` | `text` | não |  |  |  |
| 4 | `blocked_at` | `timestamp with time zone` | não | `now()` |  |  |
| 5 | `expires_at` | `timestamp with time zone` | sim |  |  |  |
| 6 | `is_permanent` | `boolean` | não | `false` |  |  |
| 7 | `blocked_by` | `uuid` | sim |  |  |  |
| 8 | `unblocked_at` | `timestamp with time zone` | sim |  |  |  |
| 9 | `unblocked_by` | `uuid` | sim |  |  |  |
| 10 | `request_count_at_block` | `integer` | sim |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| blocked_ips_blocked_by_fkey | FOREIGN KEY | `FOREIGN KEY (blocked_by) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| blocked_ips_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| blocked_ips_unblocked_by_fkey | FOREIGN KEY | `FOREIGN KEY (unblocked_by) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| blocked_ips_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX blocked_ips_pkey ON public.blocked_ips USING btree (id)` |
| idx_blocked_ips_active | btree | ip_address | não | sim | `(unblocked_at IS NULL)` | `CREATE INDEX idx_blocked_ips_active ON public.blocked_ips USING btree (ip_address) WHERE (unblocked_at IS NULL)` |
| idx_blocked_ips_blocked_by | btree | blocked_by | não | sim |  | `CREATE INDEX idx_blocked_ips_blocked_by ON public.blocked_ips USING btree (blocked_by)` |
| idx_blocked_ips_ip | btree | ip_address | não | sim |  | `CREATE INDEX idx_blocked_ips_ip ON public.blocked_ips USING btree (ip_address)` |
| idx_blocked_ips_unblocked_by | btree | unblocked_by | não | sim |  | `CREATE INDEX idx_blocked_ips_unblocked_by ON public.blocked_ips USING btree (unblocked_by)` |


## Policies (RLS)

### `Coordinators can manage blocked IPs`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role)` |
| WITH CHECK | `app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role)` |

### `Managers can view blocked IPs`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `app_private.has_role(( SELECT auth.uid() AS uid), 'manager'::app_role)` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
