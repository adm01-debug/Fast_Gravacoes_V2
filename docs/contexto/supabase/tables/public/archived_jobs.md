# public.archived_jobs

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
| 2 | `order_number` | `text` | não |  |  |  |
| 3 | `client` | `text` | não |  |  |  |
| 4 | `product` | `text` | não |  |  |  |
| 5 | `quantity` | `integer` | não |  |  |  |
| 6 | `technique_id` | `text` | não |  |  |  |
| 7 | `machine_id` | `uuid` | sim |  |  |  |
| 8 | `scheduled_date` | `date` | sim |  |  |  |
| 9 | `start_time` | `time without time zone` | sim |  |  |  |
| 10 | `end_time` | `time without time zone` | sim |  |  |  |
| 11 | `estimated_duration` | `integer` | não | `60` |  |  |
| 12 | `status` | `text` | não | `'queue'::text` |  |  |
| 13 | `gravure_color` | `text` | sim |  |  |  |
| 14 | `notes` | `text` | sim |  |  |  |
| 15 | `actual_start_time` | `timestamp with time zone` | sim |  |  |  |
| 16 | `actual_end_time` | `timestamp with time zone` | sim |  |  |  |
| 17 | `lost_pieces` | `integer` | sim | `0` |  |  |
| 18 | `priority` | `text` | não | `'medium'::text` |  |  |
| 19 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 20 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 21 | `production_photos` | `text[]` | sim | `'{}'::text[]` |  |  |
| 22 | `produced_quantity` | `integer` | sim | `0` |  |  |
| 23 | `product_category_id` | `uuid` | sim |  |  |  |
| 24 | `delay_reason` | `text` | sim |  |  |  |
| 25 | `rework_reason` | `text` | sim |  |  |  |
| 26 | `loss_category` | `text` | sim |  |  |  |
| 27 | `sort_order` | `integer` | sim | `0` |  |  |
| 28 | `operator_id` | `uuid` | sim |  |  |  |
| 29 | `shipment_id` | `uuid` | sim |  |  |  |
| 30 | `shipping_status` | `text` | sim |  |  |  |
| 31 | `parent_job_id` | `uuid` | sim |  |  |  |
| 32 | `archived_at` | `timestamp with time zone` | não | `now()` |  |  |
| 33 | `children` | `jsonb` | não | `'{}'::jsonb` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| archived_jobs_order_number_key | UNIQUE | `UNIQUE (order_number)` |  |  | sim |
| archived_jobs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| check_job_times | CHECK | `CHECK (end_time >= start_time)` |  |  | sim |
| jobs_priority_check | CHECK | `CHECK (priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text]))` |  |  | sim |
| jobs_quantity_positive | CHECK | `CHECK (quantity >= 0)` |  |  | sim |
| jobs_status_check | CHECK | `CHECK (status = ANY (ARRAY['queue'::text, 'ready'::text, 'scheduled'::text, 'production'::text, 'finished'::text, 'paused'::text, 'cancelled'::text, 'delayed'::text, 'rework'::text, 'buffer'::text, 'packaging'::text]))` |  |  | sim |
| lost_pieces_non_negative | CHECK | `CHECK (lost_pieces >= 0)` |  |  | sim |
| produced_quantity_non_negative | CHECK | `CHECK (produced_quantity >= 0)` |  |  | sim |
| quantity_non_negative | CHECK | `CHECK (quantity >= 0)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| archived_jobs_created_at_idx | btree | created_at | não | sim |  | `CREATE INDEX archived_jobs_created_at_idx ON public.archived_jobs USING btree (created_at DESC)` |
| archived_jobs_machine_id_idx | btree | machine_id | não | sim |  | `CREATE INDEX archived_jobs_machine_id_idx ON public.archived_jobs USING btree (machine_id)` |
| archived_jobs_operator_id_idx | btree | operator_id | não | sim |  | `CREATE INDEX archived_jobs_operator_id_idx ON public.archived_jobs USING btree (operator_id)` |
| archived_jobs_order_number_key | btree | order_number | sim | sim |  | `CREATE UNIQUE INDEX archived_jobs_order_number_key ON public.archived_jobs USING btree (order_number)` |
| archived_jobs_parent_job_id_idx | btree | parent_job_id | não | sim |  | `CREATE INDEX archived_jobs_parent_job_id_idx ON public.archived_jobs USING btree (parent_job_id)` |
| archived_jobs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX archived_jobs_pkey ON public.archived_jobs USING btree (id)` |
| archived_jobs_product_category_id_idx | btree | product_category_id | não | sim |  | `CREATE INDEX archived_jobs_product_category_id_idx ON public.archived_jobs USING btree (product_category_id)` |
| archived_jobs_scheduled_date_status_idx | btree | scheduled_date, status | não | sim |  | `CREATE INDEX archived_jobs_scheduled_date_status_idx ON public.archived_jobs USING btree (scheduled_date, status)` |
| archived_jobs_shipment_id_idx | btree | shipment_id | não | sim |  | `CREATE INDEX archived_jobs_shipment_id_idx ON public.archived_jobs USING btree (shipment_id)` |
| archived_jobs_status_machine_id_idx | btree | status, machine_id | não | sim |  | `CREATE INDEX archived_jobs_status_machine_id_idx ON public.archived_jobs USING btree (status, machine_id)` |
| archived_jobs_status_scheduled_date_idx | btree | status, scheduled_date | não | sim |  | `CREATE INDEX archived_jobs_status_scheduled_date_idx ON public.archived_jobs USING btree (status, scheduled_date)` |
| archived_jobs_status_sort_order_idx | btree | status, sort_order | não | sim |  | `CREATE INDEX archived_jobs_status_sort_order_idx ON public.archived_jobs USING btree (status, sort_order)` |
| archived_jobs_status_technique_id_priority_created_at_idx | btree | status, technique_id, priority, created_at | não | sim |  | `CREATE INDEX archived_jobs_status_technique_id_priority_created_at_idx ON public.archived_jobs USING btree (status, technique_id, priority, created_at)` |
| archived_jobs_status_updated_at_idx | btree | status, updated_at | não | sim |  | `CREATE INDEX archived_jobs_status_updated_at_idx ON public.archived_jobs USING btree (status, updated_at)` |
| archived_jobs_technique_id_idx | btree | technique_id | não | sim |  | `CREATE INDEX archived_jobs_technique_id_idx ON public.archived_jobs USING btree (technique_id)` |


## Policies (RLS)

### `Managers and admins can read archived jobs`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
