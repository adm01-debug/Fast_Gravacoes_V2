# public.machine_predictions

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
| 2 | `machine_id` | `uuid` | não |  |  |  |
| 3 | `prediction_type` | `text` | não |  |  |  |
| 4 | `risk_score` | `numeric(5,2)` | não |  |  |  |
| 5 | `confidence` | `numeric(5,2)` | não |  |  |  |
| 6 | `predicted_failure_date` | `date` | sim |  |  |  |
| 7 | `factors` | `jsonb` | não | `'[]'::jsonb` |  |  |
| 8 | `recommendations` | `text[]` | sim |  |  |  |
| 9 | `model_version` | `text` | não | `'v1.0'::text` |  |  |
| 10 | `is_active` | `boolean` | não | `true` |  |  |
| 11 | `acknowledged_by` | `uuid` | sim |  |  |  |
| 12 | `acknowledged_at` | `timestamp with time zone` | sim |  |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 14 | `expires_at` | `timestamp with time zone` | não | `(now() + '7 days'::interval)` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| machine_predictions_machine_id_fkey | FOREIGN KEY | `FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| machine_predictions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.prediction_history | prediction_history_prediction_id_fkey | prediction_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_machine_predictions_machine_id | btree | machine_id | não | sim |  | `CREATE INDEX idx_machine_predictions_machine_id ON public.machine_predictions USING btree (machine_id)` |
| machine_predictions_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX machine_predictions_pkey ON public.machine_predictions USING btree (id)` |


## Policies (RLS)

### `Authenticated users can view predictions`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_any_active_role()` |
| WITH CHECK |  |

### `Only coordinators can manage predictions`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role))` |
| WITH CHECK | `(app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_private.has_role(auth.uid(), 'admin'::app_role))` |


## Triggers

_nenhum_


## Grants

_nenhum_
