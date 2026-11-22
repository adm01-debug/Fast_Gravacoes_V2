# public.shift_pending_tasks

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 7 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `handover_id` | `uuid` | não |  |  |  |
| 3 | `title` | `text` | não |  |  |  |
| 4 | `description` | `text` | sim |  |  |  |
| 5 | `priority` | `text` | não | `'medium'::text` |  |  |
| 6 | `status` | `text` | não | `'pending'::text` |  |  |
| 7 | `machine_id` | `uuid` | sim |  |  |  |
| 8 | `job_id` | `uuid` | sim |  |  |  |
| 9 | `due_date` | `timestamp with time zone` | sim |  |  |  |
| 10 | `completed_at` | `timestamp with time zone` | sim |  |  |  |
| 11 | `completed_by` | `uuid` | sim |  |  |  |
| 12 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 13 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| shift_pending_tasks_handover_id_fkey | FOREIGN KEY | `FOREIGN KEY (handover_id) REFERENCES shift_handovers(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| shift_pending_tasks_job_id_fkey | FOREIGN KEY | `FOREIGN KEY (job_id) REFERENCES jobs(id)` | NO ACTION | NO ACTION | sim |
| shift_pending_tasks_machine_id_fkey | FOREIGN KEY | `FOREIGN KEY (machine_id) REFERENCES machines(id)` | NO ACTION | NO ACTION | sim |
| shift_pending_tasks_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| shift_pending_tasks_priority_check | CHECK | `CHECK (priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))` |  |  | sim |
| shift_pending_tasks_status_check | CHECK | `CHECK (status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_shift_pending_tasks_handover_id | btree | handover_id | não | sim |  | `CREATE INDEX idx_shift_pending_tasks_handover_id ON public.shift_pending_tasks USING btree (handover_id)` |
| idx_shift_pending_tasks_job_id | btree | job_id | não | sim |  | `CREATE INDEX idx_shift_pending_tasks_job_id ON public.shift_pending_tasks USING btree (job_id)` |
| idx_shift_pending_tasks_machine_id | btree | machine_id | não | sim |  | `CREATE INDEX idx_shift_pending_tasks_machine_id ON public.shift_pending_tasks USING btree (machine_id)` |
| shift_pending_tasks_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX shift_pending_tasks_pkey ON public.shift_pending_tasks USING btree (id)` |


## Policies (RLS)

### `Active roles can manage pending tasks`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK | `has_any_active_role()` |

### `Active roles can view shift pending tasks`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |

### `Authenticated users can view pending tasks`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |

### `Coordinators can manage shift pending tasks`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role)` |
| WITH CHECK | `app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role)` |

### `Elevated can delete tasks`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role))` |
| WITH CHECK |  |

### `Handover participants can insert tasks`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `((EXISTS ( SELECT 1    FROM shift_handovers h   WHERE ((h.id = shift_pending_tasks.handover_id) AND ((h.outgoing_operator_id = auth.uid()) OR (h.incoming_operator_id = auth.uid()))))) OR app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role))` |

### `Handover participants can update tasks`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((EXISTS ( SELECT 1    FROM shift_handovers h   WHERE ((h.id = shift_pending_tasks.handover_id) AND ((h.outgoing_operator_id = auth.uid()) OR (h.incoming_operator_id = auth.uid()))))) OR (completed_by = auth.uid()) OR app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role))` |
| WITH CHECK | `((EXISTS ( SELECT 1    FROM shift_handovers h   WHERE ((h.id = shift_pending_tasks.handover_id) AND ((h.outgoing_operator_id = auth.uid()) OR (h.incoming_operator_id = auth.uid()))))) OR (completed_by = auth.uid()) OR app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_shift_pending_tasks_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
