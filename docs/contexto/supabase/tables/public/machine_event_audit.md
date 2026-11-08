# public.machine_event_audit

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
| 2 | `machine_id` | `uuid` | não |  |  |  |
| 3 | `event_type` | `text` | não |  |  |  |
| 4 | `old_value` | `text` | sim |  |  |  |
| 5 | `new_value` | `text` | sim |  |  |  |
| 6 | `performed_by` | `uuid` | sim |  |  |  |
| 7 | `performed_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| machine_event_audit_machine_id_fkey | FOREIGN KEY | `FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| machine_event_audit_performed_by_fkey | FOREIGN KEY | `FOREIGN KEY (performed_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| machine_event_audit_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_machine_event_audit_machine_id | btree | machine_id | não | sim |  | `CREATE INDEX idx_machine_event_audit_machine_id ON public.machine_event_audit USING btree (machine_id)` |
| idx_machine_event_audit_performed_by | btree | performed_by | não | sim |  | `CREATE INDEX idx_machine_event_audit_performed_by ON public.machine_event_audit USING btree (performed_by)` |
| machine_event_audit_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX machine_event_audit_pkey ON public.machine_event_audit USING btree (id)` |


## Policies (RLS)

### `Staff can view machine event audit`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role) OR app_private.has_role(( SELECT auth.uid() AS uid), 'manager'::app_role))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
