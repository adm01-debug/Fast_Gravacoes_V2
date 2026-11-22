# public.jobs

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 5 |
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
| 32 | `cancel_reason` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| check_job_times | CHECK | `CHECK (end_time >= start_time)` |  |  | sim |
| jobs_machine_id_fkey | FOREIGN KEY | `FOREIGN KEY (machine_id) REFERENCES machines(id)` | NO ACTION | NO ACTION | sim |
| jobs_operator_id_fkey | FOREIGN KEY | `FOREIGN KEY (operator_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| jobs_order_number_key | UNIQUE | `UNIQUE (order_number)` |  |  | sim |
| jobs_parent_job_id_fkey | FOREIGN KEY | `FOREIGN KEY (parent_job_id) REFERENCES jobs(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| jobs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| jobs_priority_check | CHECK | `CHECK (priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text]))` |  |  | sim |
| jobs_product_category_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_category_id) REFERENCES product_categories(id)` | NO ACTION | NO ACTION | sim |
| jobs_quantity_positive | CHECK | `CHECK (quantity >= 0)` |  |  | sim |
| jobs_shipment_id_fkey | FOREIGN KEY | `FOREIGN KEY (shipment_id) REFERENCES shipments(id)` | NO ACTION | NO ACTION | sim |
| jobs_status_check | CHECK | `CHECK (status = ANY (ARRAY['queue'::text, 'ready'::text, 'scheduled'::text, 'production'::text, 'finished'::text, 'paused'::text, 'cancelled'::text, 'delayed'::text, 'rework'::text, 'buffer'::text, 'packaging'::text]))` |  |  | sim |
| jobs_technique_id_fkey | FOREIGN KEY | `FOREIGN KEY (technique_id) REFERENCES techniques(id)` | NO ACTION | NO ACTION | sim |
| lost_pieces_non_negative | CHECK | `CHECK (lost_pieces >= 0)` |  |  | sim |
| produced_quantity_non_negative | CHECK | `CHECK (produced_quantity >= 0)` |  |  | sim |
| quantity_non_negative | CHECK | `CHECK (quantity >= 0)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.abc_job_costs | abc_job_costs_job_id_fkey | job_id | CASCADE |
| public.inventory_movements | inventory_movements_job_id_fkey | job_id | SET NULL |
| public.job_status_audit | job_status_audit_job_id_fkey | job_id | CASCADE |
| public.job_status_history | job_status_history_job_id_fkey | job_id | CASCADE |
| public.jobs | jobs_parent_job_id_fkey | parent_job_id | SET NULL |
| public.lot_movements | lot_movements_job_id_fkey | job_id | SET NULL |
| public.machine_downtime | machine_downtime_job_id_fkey | job_id | NO ACTION |
| public.packaging_tasks | packaging_tasks_job_id_fkey | job_id | CASCADE |
| public.pre_production_checklists | pre_production_checklists_job_id_fkey | job_id | CASCADE |
| public.production_losses | production_losses_job_id_fkey | job_id | CASCADE |
| public.production_lots | production_lots_job_id_fkey | job_id | SET NULL |
| public.qr_scan_history | qr_scan_history_job_id_fkey | job_id | CASCADE |
| public.shift_occurrences | shift_occurrences_job_id_fkey | job_id | NO ACTION |
| public.shift_pending_tasks | shift_pending_tasks_job_id_fkey | job_id | NO ACTION |
| public.shipments | shipments_job_id_fkey | job_id | CASCADE |
| public.spc_measurements | spc_measurements_job_id_fkey | job_id | SET NULL |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_jobs_created_at_desc | btree | created_at | não | sim |  | `CREATE INDEX idx_jobs_created_at_desc ON public.jobs USING btree (created_at DESC)` |
| idx_jobs_machine_id | btree | machine_id | não | sim |  | `CREATE INDEX idx_jobs_machine_id ON public.jobs USING btree (machine_id)` |
| idx_jobs_operator_id | btree | operator_id | não | sim |  | `CREATE INDEX idx_jobs_operator_id ON public.jobs USING btree (operator_id)` |
| idx_jobs_parent_job_id | btree | parent_job_id | não | sim |  | `CREATE INDEX idx_jobs_parent_job_id ON public.jobs USING btree (parent_job_id)` |
| idx_jobs_product_category_id | btree | product_category_id | não | sim |  | `CREATE INDEX idx_jobs_product_category_id ON public.jobs USING btree (product_category_id)` |
| idx_jobs_scheduled_date_status | btree | scheduled_date, status | não | sim |  | `CREATE INDEX idx_jobs_scheduled_date_status ON public.jobs USING btree (scheduled_date, status)` |
| idx_jobs_shipment_id | btree | shipment_id | não | sim |  | `CREATE INDEX idx_jobs_shipment_id ON public.jobs USING btree (shipment_id)` |
| idx_jobs_status_machine | btree | status, machine_id | não | sim |  | `CREATE INDEX idx_jobs_status_machine ON public.jobs USING btree (status, machine_id)` |
| idx_jobs_status_scheduled | btree | status, scheduled_date | não | sim |  | `CREATE INDEX idx_jobs_status_scheduled ON public.jobs USING btree (status, scheduled_date)` |
| idx_jobs_status_sort_order | btree | status, sort_order | não | sim |  | `CREATE INDEX idx_jobs_status_sort_order ON public.jobs USING btree (status, sort_order)` |
| idx_jobs_status_technique_priority | btree | status, technique_id, priority, created_at | não | sim |  | `CREATE INDEX idx_jobs_status_technique_priority ON public.jobs USING btree (status, technique_id, priority, created_at)` |
| idx_jobs_status_updated_at | btree | status, updated_at | não | sim |  | `CREATE INDEX idx_jobs_status_updated_at ON public.jobs USING btree (status, updated_at)` |
| idx_jobs_technique_id | btree | technique_id | não | sim |  | `CREATE INDEX idx_jobs_technique_id ON public.jobs USING btree (technique_id)` |
| jobs_order_number_key | btree | order_number | sim | sim |  | `CREATE UNIQUE INDEX jobs_order_number_key ON public.jobs USING btree (order_number)` |
| jobs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX jobs_pkey ON public.jobs USING btree (id)` |


## Policies (RLS)

### `Authenticated users can view jobs`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |

### `Coordinators and managers can delete jobs`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role) OR app_private.has_role(( SELECT auth.uid() AS uid), 'manager'::app_role))` |
| WITH CHECK |  |

### `Coordinators and managers can insert jobs`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role) OR app_private.has_role(( SELECT auth.uid() AS uid), 'manager'::app_role))` |

### `Coordinators and managers can update jobs`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role) OR app_private.has_role(( SELECT auth.uid() AS uid), 'manager'::app_role))` |
| WITH CHECK |  |

### `Operators can update jobs on assigned machines`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(app_private.has_role(( SELECT auth.uid() AS uid), 'operator'::app_role) AND (machine_id IN ( SELECT operator_machines.machine_id    FROM operator_machines   WHERE (operator_machines.operator_id = ( SELECT auth.uid() AS uid)))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| audit_jobs | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.audit_trigger_func |
| on_job_finished_promote | AFTER | UPDATE | ROW | enabled | public.trigger_auto_promotion |
| tr_audit_job_changes | AFTER | UPDATE | ROW | enabled | public.audit_job_changes |
| tr_audit_job_status | AFTER | UPDATE | ROW | enabled | public.audit_job_status_change |
| trg_job_cancelled_hold_packaging | AFTER | UPDATE | ROW | enabled | public.on_job_cancelled_hold_packaging |
| trg_on_job_finished_create_packaging_task | AFTER | UPDATE | ROW | enabled | public.on_job_finished_create_packaging_task |
| trg_validate_job_cancel_reason | BEFORE | INSERT OR UPDATE | ROW | enabled | public.validate_job_cancel_reason |
| trg_validate_job_rework_depth | BEFORE | INSERT OR UPDATE | ROW | enabled | public.validate_job_rework_depth |
| trigger_check_job_overlap | BEFORE | INSERT OR UPDATE | ROW | enabled | public.check_job_overlap |
| trigger_log_job_status_change | AFTER | UPDATE | ROW | enabled | public.log_job_status_change |
| update_jobs_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
