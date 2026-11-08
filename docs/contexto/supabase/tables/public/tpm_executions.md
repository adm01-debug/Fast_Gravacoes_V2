# public.tpm_executions

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 4 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `schedule_id` | `uuid` | sim |  |  |  |
| 3 | `machine_id` | `uuid` | sim |  |  |  |
| 4 | `technician_id` | `uuid` | sim |  |  |  |
| 5 | `started_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 6 | `finished_at` | `timestamp with time zone` | sim |  |  |  |
| 7 | `duration_minutes` | `integer` | sim |  |  |  |
| 8 | `status` | `text` | sim | `'in_progress'::text` |  |  |
| 9 | `notes` | `text` | sim |  |  |  |
| 10 | `signature_url` | `text` | sim |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 12 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 13 | `checklist_version` | `integer` | sim |  |  |  |
| 14 | `checklist_snapshot` | `jsonb` | sim |  |  |  |
| 15 | `technical_sheet_id` | `uuid` | sim |  |  |  |
| 16 | `adjustment_parameters` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 17 | `technical_sheet_version` | `integer` | sim |  |  |  |
| 18 | `quality_checklist_results` | `jsonb` | sim | `'[]'::jsonb` |  |  |
| 19 | `failure_risk_detected` | `boolean` | sim | `false` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| tpm_executions_machine_id_fkey | FOREIGN KEY | `FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| tpm_executions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| tpm_executions_schedule_id_fkey | FOREIGN KEY | `FOREIGN KEY (schedule_id) REFERENCES maintenance_schedules(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| tpm_executions_technical_sheet_id_fkey | FOREIGN KEY | `FOREIGN KEY (technical_sheet_id) REFERENCES technical_sheets(id)` | NO ACTION | NO ACTION | sim |
| tpm_executions_technician_id_fkey | FOREIGN KEY | `FOREIGN KEY (technician_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_tpm_executions_machine_id | btree | machine_id | não | sim |  | `CREATE INDEX idx_tpm_executions_machine_id ON public.tpm_executions USING btree (machine_id)` |
| idx_tpm_executions_schedule_id | btree | schedule_id | não | sim |  | `CREATE INDEX idx_tpm_executions_schedule_id ON public.tpm_executions USING btree (schedule_id)` |
| idx_tpm_executions_technical_sheet_id | btree | technical_sheet_id | não | sim |  | `CREATE INDEX idx_tpm_executions_technical_sheet_id ON public.tpm_executions USING btree (technical_sheet_id)` |
| idx_tpm_executions_technician_id | btree | technician_id | não | sim |  | `CREATE INDEX idx_tpm_executions_technician_id ON public.tpm_executions USING btree (technician_id)` |
| tpm_executions_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX tpm_executions_pkey ON public.tpm_executions USING btree (id)` |


## Policies (RLS)

### `Active roles can view tpm executions`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |

### `Elevated can delete tpm executions`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role))` |
| WITH CHECK |  |

### `Technician or elevated can update tpm executions`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((technician_id = auth.uid()) OR app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role))` |
| WITH CHECK | `((technician_id = auth.uid()) OR app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role))` |

### `Technicians can insert own tpm executions`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `((technician_id = auth.uid()) OR app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_tpm_executions_updated_at | BEFORE | UPDATE | ROW | enabled | public.handle_tpm_updated_at |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
