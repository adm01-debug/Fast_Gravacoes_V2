# public.maintenance_records

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 3 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `schedule_id` | `uuid` | não |  |  |  |
| 3 | `machine_id` | `uuid` | não |  |  |  |
| 4 | `maintenance_type_id` | `text` | não |  |  |  |
| 5 | `performed_by` | `uuid` | sim |  |  |  |
| 6 | `performed_by_name` | `text` | sim |  |  |  |
| 7 | `started_at` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `completed_at` | `timestamp with time zone` | sim |  |  |  |
| 9 | `status` | `text` | não | `'in_progress'::text` |  |  |
| 10 | `notes` | `text` | sim |  |  |  |
| 11 | `photos` | `text[]` | sim | `'{}'::text[]` |  |  |
| 12 | `total_cost` | `numeric(10,2)` | sim | `0` |  |  |
| 13 | `downtime_minutes` | `integer` | sim | `0` |  |  |
| 14 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 15 | `approver_id` | `uuid` | sim |  |  |  |
| 16 | `approved_at` | `timestamp with time zone` | sim |  |  |  |
| 17 | `signature_url` | `text` | sim |  |  |  |
| 18 | `next_scheduled_date_after_approval` | `timestamp with time zone` | sim |  |  |  |
| 19 | `correction_notes` | `text` | sim |  |  |  |
| 20 | `correction_deadline` | `timestamp with time zone` | sim |  |  |  |
| 21 | `checklist_snapshot` | `jsonb` | sim |  |  |  |
| 22 | `technical_sheet_id` | `uuid` | sim |  |  |  |
| 23 | `adjustment_parameters` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 24 | `checklist_version` | `integer` | sim |  |  |  |
| 25 | `technical_sheet_version` | `integer` | sim |  |  |  |
| 26 | `quality_responses` | `jsonb` | sim | `'[]'::jsonb` |  |  |
| 27 | `justification` | `text` | sim |  |  |  |
| 28 | `override_justification` | `text` | sim |  |  |  |
| 29 | `override_by` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| maintenance_records_approver_id_fkey | FOREIGN KEY | `FOREIGN KEY (approver_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| maintenance_records_machine_id_fkey | FOREIGN KEY | `FOREIGN KEY (machine_id) REFERENCES machines(id)` | NO ACTION | NO ACTION | sim |
| maintenance_records_maintenance_type_id_fkey | FOREIGN KEY | `FOREIGN KEY (maintenance_type_id) REFERENCES maintenance_types(id)` | NO ACTION | NO ACTION | sim |
| maintenance_records_override_by_fkey | FOREIGN KEY | `FOREIGN KEY (override_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| maintenance_records_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| maintenance_records_schedule_id_fkey | FOREIGN KEY | `FOREIGN KEY (schedule_id) REFERENCES maintenance_schedules(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| maintenance_records_technical_sheet_id_fkey | FOREIGN KEY | `FOREIGN KEY (technical_sheet_id) REFERENCES technical_sheets(id)` | NO ACTION | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.maintenance_item_responses | maintenance_item_responses_record_id_fkey | record_id | CASCADE |
| public.tpm_execution_alerts | tpm_execution_alerts_execution_id_record_fkey | execution_id | CASCADE |
| public.tpm_execution_audit_logs | tpm_execution_audit_logs_execution_id_fkey | execution_id | CASCADE |
| public.tpm_execution_parts | tpm_execution_parts_execution_id_record_fkey | execution_id | CASCADE |
| public.tpm_execution_supplies | tpm_execution_supplies_execution_id_record_fkey | execution_id | CASCADE |
| public.tpm_parameter_alerts | tpm_parameter_alerts_execution_id_record_fkey | execution_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_maintenance_records_approver_id | btree | approver_id | não | sim |  | `CREATE INDEX idx_maintenance_records_approver_id ON public.maintenance_records USING btree (approver_id)` |
| idx_maintenance_records_machine_id | btree | machine_id | não | sim |  | `CREATE INDEX idx_maintenance_records_machine_id ON public.maintenance_records USING btree (machine_id)` |
| idx_maintenance_records_maintenance_type_id | btree | maintenance_type_id | não | sim |  | `CREATE INDEX idx_maintenance_records_maintenance_type_id ON public.maintenance_records USING btree (maintenance_type_id)` |
| idx_maintenance_records_override_by | btree | override_by | não | sim |  | `CREATE INDEX idx_maintenance_records_override_by ON public.maintenance_records USING btree (override_by)` |
| idx_maintenance_records_schedule_id | btree | schedule_id | não | sim |  | `CREATE INDEX idx_maintenance_records_schedule_id ON public.maintenance_records USING btree (schedule_id)` |
| idx_maintenance_records_technical_sheet_id | btree | technical_sheet_id | não | sim |  | `CREATE INDEX idx_maintenance_records_technical_sheet_id ON public.maintenance_records USING btree (technical_sheet_id)` |
| maintenance_records_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX maintenance_records_pkey ON public.maintenance_records USING btree (id)` |


## Policies (RLS)

### `Active roles can insert maintenance records`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `has_any_active_role()` |

### `Authenticated users can view maintenance records`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |

### `Owner or elevated can update maintenance records`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((performed_by = auth.uid()) OR (approver_id = auth.uid()) OR app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role))` |
| WITH CHECK | `((performed_by = auth.uid()) OR (approver_id = auth.uid()) OR app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| tr_maintenance_correction_notification | AFTER | UPDATE | ROW | enabled | public.handle_maintenance_correction_notification |
| trigger_audit_tpm_execution | AFTER | UPDATE | ROW | enabled | public.audit_tpm_execution_changes |
| trigger_save_checklist_snapshot | BEFORE | UPDATE | ROW | enabled | public.save_tpm_checklist_snapshot |


## Grants

_nenhum_
