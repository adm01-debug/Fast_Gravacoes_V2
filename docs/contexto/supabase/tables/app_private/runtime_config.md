# app_private.runtime_config

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | não |
| RLS forçado (owner) | não |
| policies | 0 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `key` | `text` | não |  |  |  |
| 2 | `value` | `text` | não |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| runtime_config_pkey | PRIMARY KEY | `PRIMARY KEY (key)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| runtime_config_pkey | btree | key | sim | sim |  | `CREATE UNIQUE INDEX runtime_config_pkey ON app_private.runtime_config USING btree (key)` |


## Policies (RLS)

> ⚠️ RLS **desabilitado** nesta tabela.



## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_normalize_functions_base_url | BEFORE | INSERT OR UPDATE | ROW | enabled | app_private.normalize_functions_base_url |


## Grants

_nenhum_
