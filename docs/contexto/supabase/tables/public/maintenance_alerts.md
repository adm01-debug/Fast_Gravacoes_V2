# public.maintenance_alerts

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
| 4 | `alert_type` | `text` | não |  |  |  |
| 5 | `message` | `text` | não |  |  |  |
| 6 | `is_read` | `boolean` | não | `false` |  |  |
| 7 | `is_resolved` | `boolean` | não | `false` |  |  |
| 8 | `resolved_by` | `uuid` | sim |  |  |  |
| 9 | `resolved_at` | `timestamp with time zone` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| maintenance_alerts_machine_id_fkey | FOREIGN KEY | `FOREIGN KEY (machine_id) REFERENCES machines(id)` | NO ACTION | NO ACTION | sim |
| maintenance_alerts_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| maintenance_alerts_schedule_id_fkey | FOREIGN KEY | `FOREIGN KEY (schedule_id) REFERENCES maintenance_schedules(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_maintenance_alerts_machine_id | btree | machine_id | não | sim |  | `CREATE INDEX idx_maintenance_alerts_machine_id ON public.maintenance_alerts USING btree (machine_id)` |
| idx_maintenance_alerts_schedule_id | btree | schedule_id | não | sim |  | `CREATE INDEX idx_maintenance_alerts_schedule_id ON public.maintenance_alerts USING btree (schedule_id)` |
| maintenance_alerts_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX maintenance_alerts_pkey ON public.maintenance_alerts USING btree (id)` |


## Policies (RLS)

### `Authenticated users can view maintenance alerts`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |

### `Elevated can insert maintenance alerts`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role))` |

### `Elevated can update maintenance alerts`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role))` |
| WITH CHECK | `(app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| on_maintenance_alert_insert | AFTER | INSERT | ROW | enabled | public.trigger_send_tpm_email |


## Grants

_nenhum_
