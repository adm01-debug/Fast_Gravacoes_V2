# public.tpm_execution_audit_logs

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
| 2 | `execution_id` | `uuid` | não |  |  |  |
| 3 | `changed_by` | `uuid` | sim |  |  |  |
| 4 | `field_name` | `text` | não |  |  |  |
| 5 | `old_value` | `text` | sim |  |  |  |
| 6 | `new_value` | `text` | sim |  |  |  |
| 7 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| tpm_execution_audit_logs_changed_by_fkey | FOREIGN KEY | `FOREIGN KEY (changed_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| tpm_execution_audit_logs_execution_id_fkey | FOREIGN KEY | `FOREIGN KEY (execution_id) REFERENCES maintenance_records(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| tpm_execution_audit_logs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_tpm_execution_audit_logs_changed_by | btree | changed_by | não | sim |  | `CREATE INDEX idx_tpm_execution_audit_logs_changed_by ON public.tpm_execution_audit_logs USING btree (changed_by)` |
| idx_tpm_execution_audit_logs_execution_id | btree | execution_id | não | sim |  | `CREATE INDEX idx_tpm_execution_audit_logs_execution_id ON public.tpm_execution_audit_logs USING btree (execution_id)` |
| tpm_execution_audit_logs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX tpm_execution_audit_logs_pkey ON public.tpm_execution_audit_logs USING btree (id)` |


## Policies (RLS)

### `Active roles can view tpm execution audit logs`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

_nenhum_
