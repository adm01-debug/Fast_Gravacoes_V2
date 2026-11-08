# public.job_status_audit

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
| 2 | `job_id` | `uuid` | não |  |  |  |
| 3 | `old_status` | `text` | sim |  |  |  |
| 4 | `new_status` | `text` | sim |  |  |  |
| 5 | `old_produced_quantity` | `integer` | sim |  |  |  |
| 6 | `new_produced_quantity` | `integer` | sim |  |  |  |
| 7 | `old_lost_pieces` | `integer` | sim |  |  |  |
| 8 | `new_lost_pieces` | `integer` | sim |  |  |  |
| 9 | `changed_by` | `uuid` | sim |  |  |  |
| 10 | `changed_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| job_status_audit_changed_by_fkey | FOREIGN KEY | `FOREIGN KEY (changed_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| job_status_audit_job_id_fkey | FOREIGN KEY | `FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| job_status_audit_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_job_status_audit_changed_by | btree | changed_by | não | sim |  | `CREATE INDEX idx_job_status_audit_changed_by ON public.job_status_audit USING btree (changed_by)` |
| idx_job_status_audit_job_id | btree | job_id | não | sim |  | `CREATE INDEX idx_job_status_audit_job_id ON public.job_status_audit USING btree (job_id)` |
| job_status_audit_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX job_status_audit_pkey ON public.job_status_audit USING btree (id)` |


## Policies (RLS)

### `Deny direct client writes to job_status_audit`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | anon, authenticated |
| USING | `false` |
| WITH CHECK | `false` |

### `Staff can view job status audit`

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

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
