# public.tpm_parameter_alerts

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
| 2 | `execution_id` | `uuid` | sim |  |  |  |
| 3 | `parameter_name` | `text` | não |  |  |  |
| 4 | `recorded_value` | `text` | sim |  |  |  |
| 5 | `recommended_range` | `text` | sim |  |  |  |
| 6 | `severity` | `text` | sim | `'warning'::text` |  |  |
| 7 | `is_resolved` | `boolean` | sim | `false` |  |  |
| 8 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 9 | `evidence_url` | `text` | sim |  |  |  |
| 10 | `evidence_notes` | `text` | sim |  |  |  |
| 11 | `evidence_files` | `text[]` | sim |  |  |  |
| 12 | `risk_level` | `text` | sim | `'medium'::text` |  |  |
| 13 | `is_critical` | `boolean` | sim | `false` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| tpm_parameter_alerts_execution_id_record_fkey | FOREIGN KEY | `FOREIGN KEY (execution_id) REFERENCES maintenance_records(id) ON DELETE CASCADE NOT VALID` | CASCADE | NO ACTION | não |
| tpm_parameter_alerts_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_tpm_parameter_alerts_execution_id | btree | execution_id | não | sim |  | `CREATE INDEX idx_tpm_parameter_alerts_execution_id ON public.tpm_parameter_alerts USING btree (execution_id)` |
| tpm_parameter_alerts_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX tpm_parameter_alerts_pkey ON public.tpm_parameter_alerts USING btree (id)` |


## Policies (RLS)

### `Authenticated users can view parameter alerts`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |

### `Coordinators and admins can manage alerts`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(app_private.has_role(auth.uid(), 'admin'::app_role) OR app_private.has_role(auth.uid(), 'coordinator'::app_role))` |
| WITH CHECK | `(app_private.has_role(auth.uid(), 'admin'::app_role) OR app_private.has_role(auth.uid(), 'coordinator'::app_role))` |

### `Managers can create parameter alerts`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `app_private.has_role(auth.uid(), 'manager'::app_role)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| tr_parameter_alert_notification | AFTER | INSERT | ROW | enabled | public.handle_parameter_alert_notification |


## Grants

_nenhum_
