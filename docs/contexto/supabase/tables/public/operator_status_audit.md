# public.operator_status_audit

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
| 2 | `operator_id` | `uuid` | não |  |  |  |
| 3 | `operator_name` | `text` | sim |  |  |  |
| 4 | `action` | `text` | não |  |  |  |
| 5 | `performed_by` | `uuid` | não |  |  |  |
| 6 | `performed_by_name` | `text` | sim |  |  |  |
| 7 | `reason` | `text` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| operator_status_audit_action_check | CHECK | `CHECK (action = ANY (ARRAY['activated'::text, 'deactivated'::text, 'removed'::text]))` |  |  | sim |
| operator_status_audit_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_operator_status_audit_created_at | btree | created_at | não | sim |  | `CREATE INDEX idx_operator_status_audit_created_at ON public.operator_status_audit USING btree (created_at DESC)` |
| idx_operator_status_audit_operator_id | btree | operator_id | não | sim |  | `CREATE INDEX idx_operator_status_audit_operator_id ON public.operator_status_audit USING btree (operator_id)` |
| operator_status_audit_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX operator_status_audit_pkey ON public.operator_status_audit USING btree (id)` |


## Policies (RLS)

### `Coordinators can insert operator audit logs`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role)` |

### `Coordinators can view operator audit logs`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
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
