# public.efficiency_alert_history

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
| 2 | `alert_type` | `text` | não |  |  |  |
| 3 | `severity` | `text` | não |  |  |  |
| 4 | `title` | `text` | não |  |  |  |
| 5 | `description` | `text` | não |  |  |  |
| 6 | `technique_id` | `text` | sim |  |  |  |
| 7 | `machine_id` | `uuid` | sim |  |  |  |
| 8 | `detected_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `resolved_at` | `timestamp with time zone` | sim |  |  |  |
| 10 | `resolved_by` | `uuid` | sim |  |  |  |
| 11 | `resolution_notes` | `text` | sim |  |  |  |
| 12 | `metadata` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| efficiency_alert_history_machine_id_fkey | FOREIGN KEY | `FOREIGN KEY (machine_id) REFERENCES machines(id)` | NO ACTION | NO ACTION | sim |
| efficiency_alert_history_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| efficiency_alert_history_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX efficiency_alert_history_pkey ON public.efficiency_alert_history USING btree (id)` |
| idx_efficiency_alert_history_machine_id | btree | machine_id | não | sim |  | `CREATE INDEX idx_efficiency_alert_history_machine_id ON public.efficiency_alert_history USING btree (machine_id)` |
| idx_efficiency_alerts_detected | btree | detected_at | não | sim |  | `CREATE INDEX idx_efficiency_alerts_detected ON public.efficiency_alert_history USING btree (detected_at DESC)` |
| idx_efficiency_alerts_resolved | btree | resolved_at | não | sim |  | `CREATE INDEX idx_efficiency_alerts_resolved ON public.efficiency_alert_history USING btree (resolved_at)` |
| idx_efficiency_alerts_type | btree | alert_type | não | sim |  | `CREATE INDEX idx_efficiency_alerts_type ON public.efficiency_alert_history USING btree (alert_type)` |


## Policies (RLS)

### `Authenticated users can view efficiency alert history`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |

### `Elevated can insert efficiency alerts`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role))` |

### `Elevated can update efficiency alerts`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role))` |
| WITH CHECK | `(app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role))` |


## Triggers

_nenhum_


## Grants

_nenhum_
