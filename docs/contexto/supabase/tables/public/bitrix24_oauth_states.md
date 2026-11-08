# public.bitrix24_oauth_states

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
| 1 | `state` | `text` | não |  |  |  |
| 2 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| bitrix24_oauth_states_pkey | PRIMARY KEY | `PRIMARY KEY (state)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| bitrix24_oauth_states_pkey | btree | state | sim | sim |  | `CREATE UNIQUE INDEX bitrix24_oauth_states_pkey ON public.bitrix24_oauth_states USING btree (state)` |


## Policies (RLS)

### `Service role only access`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `false` |
| WITH CHECK | `false` |


## Triggers

_nenhum_


## Grants

_nenhum_
