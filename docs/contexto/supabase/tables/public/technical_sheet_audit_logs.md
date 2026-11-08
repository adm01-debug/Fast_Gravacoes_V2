# public.technical_sheet_audit_logs

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
| 2 | `technical_sheet_id` | `uuid` | sim |  |  |  |
| 3 | `user_id` | `uuid` | sim |  |  |  |
| 4 | `action` | `text` | não |  |  |  |
| 5 | `changes` | `jsonb` | sim |  |  |  |
| 6 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| technical_sheet_audit_logs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| technical_sheet_audit_logs_technical_sheet_id_fkey | FOREIGN KEY | `FOREIGN KEY (technical_sheet_id) REFERENCES technical_sheets(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| technical_sheet_audit_logs_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_technical_sheet_audit_logs_technical_sheet_id | btree | technical_sheet_id | não | sim |  | `CREATE INDEX idx_technical_sheet_audit_logs_technical_sheet_id ON public.technical_sheet_audit_logs USING btree (technical_sheet_id)` |
| idx_technical_sheet_audit_logs_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_technical_sheet_audit_logs_user_id ON public.technical_sheet_audit_logs USING btree (user_id)` |
| technical_sheet_audit_logs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX technical_sheet_audit_logs_pkey ON public.technical_sheet_audit_logs USING btree (id)` |


## Policies (RLS)

### `Elevated or published sheets audit visibility`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role) OR (EXISTS ( SELECT 1    FROM technical_sheets ts   WHERE ((ts.id = technical_sheet_audit_logs.technical_sheet_id) AND (ts.status = 'published'::sheet_status)))))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
