# public.shift_checklist_templates

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
| 3 | `description` | `text` | sim |  |  |  |
| 4 | `items` | `jsonb` | não | `'[]'::jsonb` |  |  |
| 5 | `machine_id` | `uuid` | sim |  |  |  |
| 6 | `technique_id` | `text` | sim |  |  |  |
| 7 | `is_active` | `boolean` | não | `true` |  |  |
| 8 | `created_by` | `uuid` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| shift_checklist_templates_machine_id_fkey | FOREIGN KEY | `FOREIGN KEY (machine_id) REFERENCES machines(id)` | NO ACTION | NO ACTION | sim |
| shift_checklist_templates_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_shift_checklist_templates_machine_id | btree | machine_id | não | sim |  | `CREATE INDEX idx_shift_checklist_templates_machine_id ON public.shift_checklist_templates USING btree (machine_id)` |
| shift_checklist_templates_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX shift_checklist_templates_pkey ON public.shift_checklist_templates USING btree (id)` |


## Policies (RLS)

### `Authenticated users can view shift checklist templates`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |

### `Coordinators can manage templates`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role)` |
| WITH CHECK | `app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_shift_checklist_templates_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

_nenhum_
