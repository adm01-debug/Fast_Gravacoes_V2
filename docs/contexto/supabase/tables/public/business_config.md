# public.business_config

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
| 1 | `key` | `text` | não |  |  |  |
| 2 | `value` | `jsonb` | não |  |  |  |
| 3 | `description` | `text` | sim |  |  |  |
| 4 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 5 | `updated_by` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| business_config_pkey | PRIMARY KEY | `PRIMARY KEY (key)` |  |  | sim |
| business_config_updated_by_fkey | FOREIGN KEY | `FOREIGN KEY (updated_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| business_config_pkey | btree | key | sim | sim |  | `CREATE UNIQUE INDEX business_config_pkey ON public.business_config USING btree (key)` |
| idx_business_config_updated_by | btree | updated_by | não | sim |  | `CREATE INDEX idx_business_config_updated_by ON public.business_config USING btree (updated_by)` |


## Policies (RLS)

### `Apenas gestores podem atualizar configs`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `app_private.has_role(( SELECT auth.uid() AS uid), 'manager'::app_role)` |
| WITH CHECK | `app_private.has_role(( SELECT auth.uid() AS uid), 'manager'::app_role)` |

### `Configs são visíveis por todos autenticados`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |

### `Gestores podem inserir configs`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `app_private.has_role(auth.uid(), 'manager'::app_role)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| tr_update_business_config_timestamp | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_
