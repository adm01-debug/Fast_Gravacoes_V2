# public.csp_violation_reports

> Relatórios de violação de CSP coletados pela edge function csp-report (report-uri). Sem policy de INSERT: apenas service role grava.

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
| 2 | `document_uri` | `text` | sim |  |  |  |
| 3 | `referrer` | `text` | sim |  |  |  |
| 4 | `violated_directive` | `text` | sim |  |  |  |
| 5 | `effective_directive` | `text` | sim |  |  |  |
| 6 | `original_policy` | `text` | sim |  |  |  |
| 7 | `blocked_uri` | `text` | sim |  |  |  |
| 8 | `source_file` | `text` | sim |  |  |  |
| 9 | `line_number` | `integer` | sim |  |  |  |
| 10 | `column_number` | `integer` | sim |  |  |  |
| 11 | `status_code` | `integer` | sim |  |  |  |
| 12 | `disposition` | `text` | sim |  |  |  |
| 13 | `user_agent` | `text` | sim |  |  |  |
| 14 | `raw` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 15 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| csp_violation_reports_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| csp_violation_reports_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX csp_violation_reports_pkey ON public.csp_violation_reports USING btree (id)` |
| idx_csp_violation_reports_created_at | btree | created_at | não | sim |  | `CREATE INDEX idx_csp_violation_reports_created_at ON public.csp_violation_reports USING btree (created_at DESC)` |
| idx_csp_violation_reports_directive | btree | violated_directive | não | sim |  | `CREATE INDEX idx_csp_violation_reports_directive ON public.csp_violation_reports USING btree (violated_directive)` |


## Policies (RLS)

### `Coordinators and managers can view csp reports`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
