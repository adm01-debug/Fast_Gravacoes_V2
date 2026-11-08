# public.shipments

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
| 2 | `job_id` | `uuid` | sim |  |  |  |
| 3 | `provider_id` | `uuid` | sim |  |  |  |
| 4 | `tracking_code` | `text` | sim |  |  |  |
| 5 | `status` | `text` | não | `'pending'::text` |  |  |
| 6 | `origin` | `text` | sim |  |  |  |
| 7 | `destination` | `text` | sim |  |  |  |
| 8 | `estimated_delivery` | `timestamp with time zone` | sim |  |  |  |
| 9 | `actual_delivery` | `timestamp with time zone` | sim |  |  |  |
| 10 | `notes` | `text` | sim |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 13 | `freight_cost` | `numeric(10,2)` | sim | `0` |  |  |
| 14 | `insurance_cost` | `numeric(10,2)` | sim | `0` |  |  |
| 15 | `tax_cost` | `numeric(10,2)` | sim | `0` |  |  |
| 16 | `cost_currency` | `text` | sim | `'BRL'::text` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| shipments_job_id_fkey | FOREIGN KEY | `FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| shipments_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| shipments_provider_id_fkey | FOREIGN KEY | `FOREIGN KEY (provider_id) REFERENCES shipping_providers(id)` | NO ACTION | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.jobs | jobs_shipment_id_fkey | shipment_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_shipments_job_id | btree | job_id | não | sim |  | `CREATE INDEX idx_shipments_job_id ON public.shipments USING btree (job_id)` |
| idx_shipments_provider_id | btree | provider_id | não | sim |  | `CREATE INDEX idx_shipments_provider_id ON public.shipments USING btree (provider_id)` |
| shipments_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX shipments_pkey ON public.shipments USING btree (id)` |


## Policies (RLS)

### `Active roles can view shipments`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |

### `Coordinators and above can manage shipments`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(app_private.has_role(auth.uid(), 'admin'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'coordinator'::app_role))` |
| WITH CHECK | `(app_private.has_role(auth.uid(), 'admin'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'coordinator'::app_role))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| audit_shipments_trigger | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.audit_logistics_changes |
| update_shipments_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
