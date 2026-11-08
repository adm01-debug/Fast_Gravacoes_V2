# public.shipping_providers

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
| 2 | `name` | `text` | não |  |  |  |
| 3 | `contact_info` | `text` | sim |  |  |  |
| 4 | `is_active` | `boolean` | sim | `true` |  |  |
| 5 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 6 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| shipping_providers_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.shipments | shipments_provider_id_fkey | provider_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| shipping_providers_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX shipping_providers_pkey ON public.shipping_providers USING btree (id)` |


## Policies (RLS)

### `Active roles can view shipping providers`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |

### `Managers and admins can manage shipping providers`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(app_private.has_role(auth.uid(), 'admin'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role))` |
| WITH CHECK | `(app_private.has_role(auth.uid(), 'admin'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| audit_shipping_providers_trigger | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.audit_logistics_changes |
| update_shipping_providers_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_
