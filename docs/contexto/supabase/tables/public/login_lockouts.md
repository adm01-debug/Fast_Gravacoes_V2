# public.login_lockouts

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
| 2 | `identifier` | `text` | não |  |  |  |
| 3 | `identifier_type` | `text` | não |  |  |  |
| 4 | `failed_attempts` | `integer` | não | `0` |  |  |
| 5 | `last_failed_at` | `timestamp with time zone` | sim |  |  |  |
| 6 | `locked_until` | `timestamp with time zone` | sim |  |  |  |
| 7 | `lockout_count` | `integer` | não | `0` |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| login_lockouts_identifier_identifier_type_key | UNIQUE | `UNIQUE (identifier, identifier_type)` |  |  | sim |
| login_lockouts_identifier_type_check | CHECK | `CHECK (identifier_type = ANY (ARRAY['email'::text, 'ip'::text]))` |  |  | sim |
| login_lockouts_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_login_lockouts_locked_until | btree | locked_until | não | sim | `(locked_until IS NOT NULL)` | `CREATE INDEX idx_login_lockouts_locked_until ON public.login_lockouts USING btree (locked_until) WHERE (locked_until IS NOT NULL)` |
| login_lockouts_identifier_identifier_type_key | btree | identifier, identifier_type | sim | sim |  | `CREATE UNIQUE INDEX login_lockouts_identifier_identifier_type_key ON public.login_lockouts USING btree (identifier, identifier_type)` |
| login_lockouts_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX login_lockouts_pkey ON public.login_lockouts USING btree (id)` |


## Policies (RLS)

### `Service role only`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `false` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_login_lockouts_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_
