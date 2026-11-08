# public.packaging_task_checklist

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
| 2 | `packaging_task_id` | `uuid` | não |  |  |  |
| 3 | `item_id` | `uuid` | não |  |  |  |
| 4 | `is_checked` | `boolean` | não | `false` |  |  |
| 5 | `notes` | `text` | sim |  |  |  |
| 6 | `checked_by` | `uuid` | sim |  |  |  |
| 7 | `checked_at` | `timestamp with time zone` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| packaging_task_checklist_checked_by_fkey | FOREIGN KEY | `FOREIGN KEY (checked_by) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| packaging_task_checklist_item_id_fkey | FOREIGN KEY | `FOREIGN KEY (item_id) REFERENCES packaging_checklist_items(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| packaging_task_checklist_packaging_task_id_fkey | FOREIGN KEY | `FOREIGN KEY (packaging_task_id) REFERENCES packaging_tasks(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| packaging_task_checklist_packaging_task_id_item_id_key | UNIQUE | `UNIQUE (packaging_task_id, item_id)` |  |  | sim |
| packaging_task_checklist_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_pkg_task_checklist_task | btree | packaging_task_id | não | sim |  | `CREATE INDEX idx_pkg_task_checklist_task ON public.packaging_task_checklist USING btree (packaging_task_id)` |
| packaging_task_checklist_packaging_task_id_item_id_key | btree | packaging_task_id, item_id | sim | sim |  | `CREATE UNIQUE INDEX packaging_task_checklist_packaging_task_id_item_id_key ON public.packaging_task_checklist USING btree (packaging_task_id, item_id)` |
| packaging_task_checklist_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX packaging_task_checklist_pkey ON public.packaging_task_checklist USING btree (id)` |


## Policies (RLS)

### `pkg_task_checklist_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |

### `pkg_task_checklist_write`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'operator'::app_role))` |
| WITH CHECK | `(app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'operator'::app_role))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_audit_packaging_task_checklist | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.audit_trigger_func |
| trg_pkg_task_checklist_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_
