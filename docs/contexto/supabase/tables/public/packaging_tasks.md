# public.packaging_tasks

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 3 |
| realtime (publication) | sim |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `job_id` | `uuid` | não |  |  |  |
| 3 | `status` | `text` | não | `'pending'::text` |  |  |
| 4 | `assigned_to` | `uuid` | sim |  |  |  |
| 5 | `received_quantity` | `integer` | não | `0` |  |  |
| 6 | `approved_quantity` | `integer` | não | `0` |  |  |
| 7 | `rejected_quantity` | `integer` | não | `0` |  |  |
| 8 | `package_type` | `text` | sim |  |  |  |
| 9 | `packages_count` | `integer` | sim |  |  |  |
| 10 | `total_weight_kg` | `numeric(10,3)` | sim |  |  |  |
| 11 | `started_at` | `timestamp with time zone` | sim |  |  |  |
| 12 | `completed_at` | `timestamp with time zone` | sim |  |  |  |
| 13 | `notes` | `text` | sim |  |  |  |
| 14 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 15 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 16 | `delay_reason` | `text` | sim |  |  |  |
| 17 | `delay_category` | `text` | sim |  |  |  |
| 18 | `was_overdue_on_complete` | `boolean` | não | `false` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| packaging_tasks_approved_quantity_check | CHECK | `CHECK (approved_quantity >= 0)` |  |  | sim |
| packaging_tasks_assigned_to_fkey | FOREIGN KEY | `FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| packaging_tasks_job_id_fkey | FOREIGN KEY | `FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| packaging_tasks_job_id_key | UNIQUE | `UNIQUE (job_id)` |  |  | sim |
| packaging_tasks_packages_count_check | CHECK | `CHECK (packages_count IS NULL OR packages_count >= 0)` |  |  | sim |
| packaging_tasks_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| packaging_tasks_qty_sum | CHECK | `CHECK ((approved_quantity + rejected_quantity) <= received_quantity)` |  |  | sim |
| packaging_tasks_received_quantity_check | CHECK | `CHECK (received_quantity >= 0)` |  |  | sim |
| packaging_tasks_rejected_quantity_check | CHECK | `CHECK (rejected_quantity >= 0)` |  |  | sim |
| packaging_tasks_status_check | CHECK | `CHECK (status = ANY (ARRAY['pending'::text, 'in_triage'::text, 'packaging'::text, 'ready_to_ship'::text, 'on_hold'::text]))` |  |  | sim |
| packaging_tasks_total_weight_kg_check | CHECK | `CHECK (total_weight_kg IS NULL OR total_weight_kg >= 0::numeric)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.packaging_defects | packaging_defects_packaging_task_id_fkey | packaging_task_id | CASCADE |
| public.packaging_task_checklist | packaging_task_checklist_packaging_task_id_fkey | packaging_task_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_packaging_tasks_assigned_to | btree | assigned_to | não | sim |  | `CREATE INDEX idx_packaging_tasks_assigned_to ON public.packaging_tasks USING btree (assigned_to)` |
| idx_packaging_tasks_created_at | btree | created_at | não | sim |  | `CREATE INDEX idx_packaging_tasks_created_at ON public.packaging_tasks USING btree (created_at DESC)` |
| idx_packaging_tasks_delay_category | btree | delay_category | não | sim | `(delay_category IS NOT NULL)` | `CREATE INDEX idx_packaging_tasks_delay_category ON public.packaging_tasks USING btree (delay_category) WHERE (delay_category IS NOT NULL)` |
| idx_packaging_tasks_status | btree | status | não | sim |  | `CREATE INDEX idx_packaging_tasks_status ON public.packaging_tasks USING btree (status)` |
| packaging_tasks_job_id_key | btree | job_id | sim | sim |  | `CREATE UNIQUE INDEX packaging_tasks_job_id_key ON public.packaging_tasks USING btree (job_id)` |
| packaging_tasks_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX packaging_tasks_pkey ON public.packaging_tasks USING btree (id)` |


## Policies (RLS)

### `Operators update their own packaging tasks`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(app_private.has_role(auth.uid(), 'operator'::app_role) AND ((assigned_to IS NULL) OR (assigned_to = auth.uid())))` |
| WITH CHECK | `(app_private.has_role(auth.uid(), 'operator'::app_role) AND ((assigned_to IS NULL) OR (assigned_to = auth.uid())))` |

### `Operators view unassigned or own packaging tasks`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_any_active_role() AND ((assigned_to IS NULL) OR (assigned_to = auth.uid())))` |
| WITH CHECK |  |

### `Staff manage all packaging tasks`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role))` |
| WITH CHECK | `(app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_audit_packaging_tasks | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.audit_trigger_func |
| trg_enforce_pkg_checklist | BEFORE | UPDATE | ROW | enabled | public.enforce_packaging_checklist_before_ship |
| trg_notify_packaging_task_created | AFTER | INSERT | ROW | enabled | public.notify_packaging_task_created |
| trg_packaging_ready_create_shipment | AFTER | UPDATE | ROW | enabled | public.on_packaging_ready_create_shipment |
| trg_packaging_tasks_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
