# public.machines

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
| 2 | `code` | `text` | não |  |  |  |
| 3 | `name` | `text` | não |  |  |  |
| 4 | `technique_id` | `text` | não |  |  |  |
| 5 | `is_active` | `boolean` | não | `true` |  |  |
| 6 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| machines_code_key | UNIQUE | `UNIQUE (code)` |  |  | sim |
| machines_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| machines_technique_id_fkey | FOREIGN KEY | `FOREIGN KEY (technique_id) REFERENCES techniques(id)` | NO ACTION | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.efficiency_alert_history | efficiency_alert_history_machine_id_fkey | machine_id | NO ACTION |
| public.energy_alerts | energy_alerts_machine_id_fkey | machine_id | NO ACTION |
| public.energy_consumption | energy_consumption_machine_id_fkey | machine_id | NO ACTION |
| public.energy_targets | energy_targets_machine_id_fkey | machine_id | NO ACTION |
| public.jobs | jobs_machine_id_fkey | machine_id | NO ACTION |
| public.kpi_alerts | kpi_alerts_machine_id_fkey | machine_id | CASCADE |
| public.machine_downtime | machine_downtime_machine_id_fkey | machine_id | CASCADE |
| public.machine_event_audit | machine_event_audit_machine_id_fkey | machine_id | CASCADE |
| public.machine_health_metrics | machine_health_metrics_machine_id_fkey | machine_id | CASCADE |
| public.machine_predictions | machine_predictions_machine_id_fkey | machine_id | CASCADE |
| public.maintenance_alerts | maintenance_alerts_machine_id_fkey | machine_id | NO ACTION |
| public.maintenance_records | maintenance_records_machine_id_fkey | machine_id | NO ACTION |
| public.maintenance_schedules | maintenance_schedules_machine_id_fkey | machine_id | CASCADE |
| public.operator_machines | operator_machines_machine_id_fkey | machine_id | CASCADE |
| public.prediction_history | prediction_history_machine_id_fkey | machine_id | NO ACTION |
| public.shift_checklist_templates | shift_checklist_templates_machine_id_fkey | machine_id | NO ACTION |
| public.shift_handovers | shift_handovers_machine_id_fkey | machine_id | NO ACTION |
| public.shift_occurrences | shift_occurrences_machine_id_fkey | machine_id | NO ACTION |
| public.shift_pending_tasks | shift_pending_tasks_machine_id_fkey | machine_id | NO ACTION |
| public.spc_control_parameters | spc_control_parameters_machine_id_fkey | machine_id | SET NULL |
| public.technical_sheets | technical_sheets_recommended_machine_id_fkey | recommended_machine_id | NO ACTION |
| public.tpm_executions | tpm_executions_machine_id_fkey | machine_id | CASCADE |
| public.tpm_notification_logs | tpm_notification_logs_machine_id_fkey | machine_id | SET NULL |
| public.tpm_notification_queue | tpm_notification_queue_machine_id_fkey | machine_id | CASCADE |
| public.tpm_severity_configs | tpm_severity_configs_machine_id_fkey | machine_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_machines_technique_id | btree | technique_id | não | sim |  | `CREATE INDEX idx_machines_technique_id ON public.machines USING btree (technique_id)` |
| machines_code_key | btree | code | sim | sim |  | `CREATE UNIQUE INDEX machines_code_key ON public.machines USING btree (code)` |
| machines_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX machines_pkey ON public.machines USING btree (id)` |


## Policies (RLS)

### `Authenticated users can view machines`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |

### `Coordinators can manage machines`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role)` |
| WITH CHECK | `app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| tr_audit_machine_changes | AFTER | UPDATE | ROW | enabled | public.audit_machine_changes |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
