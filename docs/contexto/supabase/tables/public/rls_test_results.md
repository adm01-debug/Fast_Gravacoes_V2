# public.rls_test_results

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
| 2 | `test_name` | `text` | não |  |  |  |
| 3 | `table_name` | `text` | não |  |  |  |
| 4 | `role` | `text` | não |  |  |  |
| 5 | `operation` | `text` | não |  |  |  |
| 6 | `passed` | `boolean` | não |  |  |  |
| 7 | `error_message` | `text` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| rls_test_results_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| rls_test_results_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX rls_test_results_pkey ON public.rls_test_results USING btree (id)` |


## Policies (RLS)

### `Allow authenticated to view test results`

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
