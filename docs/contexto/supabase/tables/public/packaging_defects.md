# public.packaging_defects

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 5 |
| realtime (publication) | sim |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `packaging_task_id` | `uuid` | não |  |  |  |
| 3 | `quantity` | `integer` | não |  |  |  |
| 4 | `defect_type` | `text` | não |  |  |  |
| 5 | `severity` | `text` | não | `'minor'::text` |  |  |
| 6 | `decision` | `text` | não | `'discard'::text` |  |  |
| 7 | `photo_url` | `text` | sim |  |  |  |
| 8 | `reported_by` | `uuid` | sim |  |  |  |
| 9 | `notes` | `text` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| packaging_defects_decision_check | CHECK | `CHECK (decision = ANY (ARRAY['rework'::text, 'discard'::text, 'accept_with_note'::text]))` |  |  | sim |
| packaging_defects_defect_type_check | CHECK | `CHECK (defect_type = ANY (ARRAY['print_misalignment'::text, 'color_deviation'::text, 'scratch'::text, 'contamination'::text, 'wrong_material'::text, 'dimensional'::text, 'other'::text]))` |  |  | sim |
| packaging_defects_packaging_task_id_fkey | FOREIGN KEY | `FOREIGN KEY (packaging_task_id) REFERENCES packaging_tasks(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| packaging_defects_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| packaging_defects_quantity_check | CHECK | `CHECK (quantity > 0)` |  |  | sim |
| packaging_defects_reported_by_fkey | FOREIGN KEY | `FOREIGN KEY (reported_by) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| packaging_defects_severity_check | CHECK | `CHECK (severity = ANY (ARRAY['minor'::text, 'major'::text, 'critical'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_packaging_defects_created_at | btree | created_at | não | sim |  | `CREATE INDEX idx_packaging_defects_created_at ON public.packaging_defects USING btree (created_at DESC)` |
| idx_packaging_defects_task | btree | packaging_task_id | não | sim |  | `CREATE INDEX idx_packaging_defects_task ON public.packaging_defects USING btree (packaging_task_id)` |
| packaging_defects_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX packaging_defects_pkey ON public.packaging_defects USING btree (id)` |


## Policies (RLS)

### `Anyone can see defects`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |

### `Authorized defect management`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM packaging_tasks   WHERE ((packaging_tasks.id = packaging_defects.packaging_task_id) AND ((packaging_tasks.assigned_to = auth.uid()) OR app_private.has_role(auth.uid(), 'coordinator'::app_role)))))` |
| WITH CHECK |  |

### `Operators insert defects on their tasks`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(app_private.has_role(auth.uid(), 'operator'::app_role) AND (reported_by = auth.uid()) AND (EXISTS ( SELECT 1    FROM packaging_tasks t   WHERE ((t.id = packaging_defects.packaging_task_id) AND ((t.assigned_to IS NULL) OR (t.assigned_to = auth.uid()))))))` |

### `Operators view defects of accessible tasks`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_any_active_role() AND (EXISTS ( SELECT 1    FROM packaging_tasks t   WHERE ((t.id = packaging_defects.packaging_task_id) AND ((t.assigned_to IS NULL) OR (t.assigned_to = auth.uid()))))))` |
| WITH CHECK |  |

### `Staff manage all defects`

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
| trg_audit_packaging_defects | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.audit_trigger_func |
| trg_notify_packaging_defect_critical | AFTER | INSERT | ROW | enabled | public.notify_packaging_defect_critical |
| trg_packaging_defect_create_rework | AFTER | INSERT | ROW | enabled | public.on_packaging_defect_create_rework_job |
| trg_packaging_defects_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_
