# public.erp_api_keys

> Stores SHA-256 hashed API keys for ERP integration authentication.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 1 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `name` | `text` | não |  |  |  |
| 3 | `key_hash` | `text` | não |  |  |  |
| 4 | `is_active` | `boolean` | não | `true` |  |  |
| 5 | `created_by` | `uuid` | sim |  |  |  |
| 6 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 7 | `last_used_at` | `timestamp with time zone` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| erp_api_keys_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| erp_api_keys_key_hash_key | UNIQUE | `UNIQUE (key_hash)` |  |  | sim |
| erp_api_keys_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| erp_api_keys_key_hash_key | btree | key_hash | sim | sim |  | `CREATE UNIQUE INDEX erp_api_keys_key_hash_key ON public.erp_api_keys USING btree (key_hash)` |
| erp_api_keys_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX erp_api_keys_pkey ON public.erp_api_keys USING btree (id)` |


## Policies (RLS)

### `Managers can manage API keys`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `app_private.has_role(( SELECT auth.uid() AS uid), 'manager'::app_role)` |
| WITH CHECK | `app_private.has_role(( SELECT auth.uid() AS uid), 'manager'::app_role)` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
