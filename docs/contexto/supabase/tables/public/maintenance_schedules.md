# public.maintenance_schedules

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
| 2 | `machine_id` | `uuid` | não |  |  |  |
| 3 | `maintenance_type_id` | `text` | não |  |  |  |
| 4 | `name` | `text` | não |  |  |  |
| 5 | `description` | `text` | sim |  |  |  |
| 6 | `interval_days` | `integer` | não | `30` |  |  |
| 7 | `last_completed_at` | `timestamp with time zone` | sim |  |  |  |
| 8 | `next_due_at` | `timestamp with time zone` | não |  |  |  |
| 9 | `estimated_duration_minutes` | `integer` | não | `60` |  |  |
| 10 | `is_active` | `boolean` | não | `true` |  |  |
| 11 | `created_by` | `uuid` | sim |  |  |  |
| 12 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 13 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| maintenance_schedule_dates_valid | CHECK | `CHECK (next_due_at >= created_at)` |  |  | sim |
| maintenance_schedules_machine_id_fkey | FOREIGN KEY | `FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| maintenance_schedules_maintenance_type_id_fkey | FOREIGN KEY | `FOREIGN KEY (maintenance_type_id) REFERENCES maintenance_types(id)` | NO ACTION | NO ACTION | sim |
| maintenance_schedules_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.maintenance_alerts | maintenance_alerts_schedule_id_fkey | schedule_id | CASCADE |
| public.maintenance_records | maintenance_records_schedule_id_fkey | schedule_id | CASCADE |
| public.tpm_executions | tpm_executions_schedule_id_fkey | schedule_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_maintenance_schedules_machine_id | btree | machine_id | não | sim |  | `CREATE INDEX idx_maintenance_schedules_machine_id ON public.maintenance_schedules USING btree (machine_id)` |
| idx_maintenance_schedules_maintenance_type_id | btree | maintenance_type_id | não | sim |  | `CREATE INDEX idx_maintenance_schedules_maintenance_type_id ON public.maintenance_schedules USING btree (maintenance_type_id)` |
| maintenance_schedules_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX maintenance_schedules_pkey ON public.maintenance_schedules USING btree (id)` |


## Policies (RLS)

### `Admins can manage maintenance schedules`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `app_private.has_role(auth.uid(), 'admin'::app_role)` |
| WITH CHECK | `app_private.has_role(auth.uid(), 'admin'::app_role)` |

### `Authenticated users can view maintenance schedules`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |

### `Coordinators can manage maintenance schedules`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role)` |
| WITH CHECK | `app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role)` |

### `Managers can manage maintenance schedules`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `app_private.has_role(auth.uid(), 'manager'::app_role)` |
| WITH CHECK | `app_private.has_role(auth.uid(), 'manager'::app_role)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_maintenance_schedules_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
