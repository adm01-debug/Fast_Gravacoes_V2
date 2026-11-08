# public.tpm_execution_alerts

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
| 2 | `execution_id` | `uuid` | não |  |  |  |
| 3 | `alert_type` | `text` | não |  |  |  |
| 4 | `parameter_name` | `text` | sim |  |  |  |
| 5 | `expected_range` | `text` | sim |  |  |  |
| 6 | `actual_value` | `text` | sim |  |  |  |
| 7 | `severity` | `text` | sim | `'warning'::text` |  |  |
| 8 | `description` | `text` | sim |  |  |  |
| 9 | `evidence_urls` | `text[]` | sim | `'{}'::text[]` |  |  |
| 10 | `resolved` | `boolean` | sim | `false` |  |  |
| 11 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 12 | `is_critical` | `boolean` | sim | `false` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| tpm_execution_alerts_execution_id_record_fkey | FOREIGN KEY | `FOREIGN KEY (execution_id) REFERENCES maintenance_records(id) ON DELETE CASCADE NOT VALID` | CASCADE | NO ACTION | não |
| tpm_execution_alerts_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_tpm_execution_alerts_execution_id | btree | execution_id | não | sim |  | `CREATE INDEX idx_tpm_execution_alerts_execution_id ON public.tpm_execution_alerts USING btree (execution_id)` |
| tpm_execution_alerts_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX tpm_execution_alerts_pkey ON public.tpm_execution_alerts USING btree (id)` |


## Policies (RLS)

### `Active roles can manage tpm execution alerts`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK | `has_any_active_role()` |

### `Authenticated users can view tpm execution alerts`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| on_tpm_execution_alert | AFTER | INSERT | ROW | enabled | public.notify_loss_risk |


## Grants

_nenhum_
